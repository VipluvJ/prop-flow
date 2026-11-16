import { and, eq, isNull, sql, desc } from "drizzle-orm";

import { db } from "../../db/index.js";
import { leads, followUps, leadActivities, users } from "../../db/schema.js";

export async function getDashboard(currentUser) {
  // STEP 1: Build the base conditions
  const conditions = [
    eq(leads.organizationId, currentUser.organizationId),
    isNull(leads.deletedAt),
  ];

  // STEP 2: Restrict agents to their own leads
  if (currentUser.role === "agent") {
    conditions.push(eq(leads.assignedTo, currentUser.sub));
  }

  // STEP 3: Define the metrics we want PostgreSQL to calculate
  const summarySelection = {
    totalLeads: sql`count(*)`.mapWith(Number),

    activeLeads: sql`
      count(*) FILTER (
        WHERE ${leads.status} IN (
          'new',
          'contacted',
          'qualified',
          'site_visit',
          'negotiation'
        )
      )
    `.mapWith(Number),

    bookedLeads: sql`
      count(*) FILTER (
        WHERE ${leads.status} = 'booked'
      )
    `.mapWith(Number),
  };

  // Unassigned leads are meaningful for admins.
  // Agents only see their assigned leads.
  if (currentUser.role === "admin") {
    summarySelection.unassignedLeads = sql`
      count(*) FILTER (
        WHERE ${leads.assignedTo} IS NULL
      )
    `.mapWith(Number);
  }

  // STEP 4: Execute the query
  const [summary] = await db
    .select(summarySelection)
    .from(leads)
    .where(and(...conditions));

  // STEP 5: Group leads by their status
  const leadsByStatus = await db
    .select({
      status: leads.status,
      count: sql`count(*)`.mapWith(Number),
    })
    .from(leads)
    .where(and(...conditions))
    .groupBy(leads.status)
    .orderBy(leads.status);

  // STEP 6: Build follow-up conditions
  const followUpConditions = [
    eq(followUps.organizationId, currentUser.organizationId),
  ];

  // Agents only see their own follow-ups
  if (currentUser.role === "agent") {
    followUpConditions.push(eq(followUps.assignedTo, currentUser.sub));
  }

  // STEP 7: Calculate follow-up metrics

  const [followUpSummary] = await db
    .select({
      dueToday: sql`
  count(*) FILTER (
    WHERE ${followUps.completedAt} IS NULL
    AND ${followUps.dueAt} >= CURRENT_TIMESTAMP
    AND (
      ${followUps.dueAt} AT TIME ZONE 'Asia/Kolkata'
    )::date = (
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    )::date
  )
`.mapWith(Number),

      overdue: sql`
  count(*) FILTER (
    WHERE ${followUps.completedAt} IS NULL
    AND ${followUps.dueAt} < CURRENT_TIMESTAMP
  )
`.mapWith(Number),

      completed: sql`
        count(*) FILTER (
          WHERE ${followUps.completedAt} IS NOT NULL
        )
      `.mapWith(Number),
    })
    .from(followUps)
    .where(and(...followUpConditions));

  // STEP 8: Build activity conditions
  const activityConditions = [
    eq(leadActivities.organizationId, currentUser.organizationId),
    isNull(leads.deletedAt),
  ];

  // Agents only see activities belonging to their currently assigned leads
  if (currentUser.role === "agent") {
    activityConditions.push(eq(leads.assignedTo, currentUser.sub));
  }

  // STEP 9: Fetch the 10 most recent activities
  const recentActivities = await db
    .select({
      id: leadActivities.id,
      type: leadActivities.type,
      description: leadActivities.description,
      createdAt: leadActivities.createdAt,

      leadId: leads.id,
      leadName: leads.name,

      userId: users.id,
      userName: users.name,
    })
    .from(leadActivities)
    .innerJoin(
      leads,
      and(
        eq(leadActivities.leadId, leads.id),
        eq(leadActivities.organizationId, leads.organizationId),
      ),
    )
    .innerJoin(
      users,
      and(
        eq(leadActivities.userId, users.id),
        eq(leadActivities.organizationId, users.organizationId),
      ),
    )
    .where(and(...activityConditions))
    .orderBy(desc(leadActivities.createdAt))
    .limit(10);

  // STEP 10: Agent performance (admins only)
  let agentPerformance = [];

  if (currentUser.role === "admin") {
    agentPerformance = await db
      .select({
        agentId: users.id,
        agentName: users.name,
        isActive: users.isActive,

        totalLeads: sql`
          count(${leads.id})
        `.mapWith(Number),

        bookedLeads: sql`
          count(${leads.id}) FILTER (
            WHERE ${leads.status} = 'booked'
          )
        `.mapWith(Number),
      })
      .from(users)
      .leftJoin(
        leads,
        and(
          eq(leads.assignedTo, users.id),
          eq(leads.organizationId, users.organizationId),
          isNull(leads.deletedAt),
        ),
      )
      .where(
        and(
          eq(users.organizationId, currentUser.organizationId),
          eq(users.role, "agent"),
        ),
      )
      .groupBy(users.id, users.name, users.isActive)
      .orderBy(desc(sql`count(${leads.id})`));
  }

  // STEP 11: Return all dashboard data
  return {
    summary,
    leadsByStatus,
    followUps: followUpSummary,
    recentActivities,
    agentPerformance,
  };
}
