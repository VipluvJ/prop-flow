import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { leads, users, leadAssignments } from "../../db/schema.js";

export async function assignLead(leadId, agentId, currentUser) {
  return db.transaction(async (tx) => {
    // STEP 1: Verify the agent
    const [agent] = await tx
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.id, agentId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .limit(1)
      .for("update");

    if (!agent) {
      return { status: "agent_not_found" };
    }

    if (agent.role !== "agent") {
      return { status: "not_an_agent" };
    }

    if (!agent.isActive) {
      return { status: "inactive_agent" };
    }

    // STEP 2: Lock and fetch the lead
    const [lead] = await tx
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.organizationId, currentUser.organizationId),
          isNull(leads.deletedAt),
        ),
      )
      .limit(1)
      .for("update");

    if (!lead) {
      return { status: "lead_not_found" };
    }

    // STEP 3: Prevent assigning to the same agent
    const previousAssignedTo = lead.assignedTo;

    if (previousAssignedTo === agentId) {
      return { status: "already_assigned" };
    }

    // STEP 4: Update the current assignment
    const now = new Date();

    const [updatedLead] = await tx
      .update(leads)
      .set({
        assignedTo: agentId,
        assignedBy: currentUser.sub,
        assignedAt: now,
        updatedAt: now,
        version: sql`${leads.version} + 1`,
      })
      .where(eq(leads.id, leadId))
      .returning();

    // STEP 5: Record assignment history
    await tx.insert(leadAssignments).values({
      organizationId: currentUser.organizationId,
      leadId,
      previousAssignedTo,
      newAssignedTo: agentId,
      assignedBy: currentUser.sub,
    });

    return {
      status: "success",
      lead: updatedLead,
    };
  });
}
