import { and, eq, isNull, desc } from "drizzle-orm";

import { db } from "../../db/index.js";
import { leads, leadActivities } from "../../db/schema.js";

// CHECK WHETHER THE USER CAN ACCESS THE LEAD
async function findAccessibleLead(leadId, currentUser) {
  const conditions = [
    eq(leads.id, leadId),
    eq(leads.organizationId, currentUser.organizationId),
    isNull(leads.deletedAt),
  ];

  if (currentUser.role === "agent") {
    conditions.push(eq(leads.assignedTo, currentUser.sub));
  }

  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(...conditions))
    .limit(1);

  return lead ?? null;
}

// CREATE ACTIVITY
export async function createActivity(leadId, data, currentUser) {
  const lead = await findAccessibleLead(leadId, currentUser);

  if (!lead) {
    return null;
  }

  const [activity] = await db
    .insert(leadActivities)
    .values({
      organizationId: currentUser.organizationId,
      leadId,
      userId: currentUser.sub,
      type: data.type,
      description: data.description,
    })
    .returning();

  return activity;
}

// GET LEAD ACTIVITIES
export async function getLeadActivities(leadId, currentUser) {
  const lead = await findAccessibleLead(leadId, currentUser);

  if (!lead) {
    return null;
  }

  const activities = await db
    .select()
    .from(leadActivities)
    .where(
      and(
        eq(leadActivities.leadId, leadId),
        eq(leadActivities.organizationId, currentUser.organizationId),
      ),
    )
    .orderBy(desc(leadActivities.createdAt));

  return activities;
}
