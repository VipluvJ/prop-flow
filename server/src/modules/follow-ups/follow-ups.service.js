import { and, eq, isNull, isNotNull, lt, gte, asc, count } from "drizzle-orm";

import { db } from "../../db/index.js";
import { followUps, leads, users } from "../../db/schema.js";

export async function createFollowUp(leadId, data, currentUser) {
  return db.transaction(async (tx) => {
    // STEP 1: Find the lead within the user's organization.
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
      .limit(1);

    if (!lead) {
      return { status: "lead_not_found" };
    }

    // STEP 2: Check agent-level access.
    if (currentUser.role === "agent" && lead.assignedTo !== currentUser.sub) {
      return { status: "forbidden" };
    }

    // STEP 3: Decide who will own the follow-up.
    const assignedTo =
      currentUser.role === "agent"
        ? currentUser.sub
        : (data.assignedTo ?? lead.assignedTo);

    if (!assignedTo) {
      return { status: "assignee_required" };
    }

    // STEP 4: Verify the selected agent.
    const [agent] = await tx
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.id, assignedTo),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .limit(1);

    if (!agent) {
      return { status: "agent_not_found" };
    }

    if (agent.role !== "agent") {
      return { status: "not_an_agent" };
    }

    if (!agent.isActive) {
      return { status: "inactive_agent" };
    }

    // STEP 5: Insert the follow-up.
    const [followUp] = await tx
      .insert(followUps)
      .values({
        organizationId: currentUser.organizationId,
        leadId,
        assignedTo,
        note: data.note,
        dueAt: data.dueAt,
      })
      .returning();

    return {
      status: "success",
      followUp,
    };
  });
}

export async function getFollowUps(filters, currentUser) {
  const now = new Date();

  const conditions = [eq(followUps.organizationId, currentUser.organizationId)];

  // Agents can only see their own follow-ups.
  if (currentUser.role === "agent") {
    conditions.push(eq(followUps.assignedTo, currentUser.sub));
  }

  // Filter by lead.
  if (filters.leadId) {
    conditions.push(eq(followUps.leadId, filters.leadId));
  }

  // Filter by follow-up status.
  if (filters.status === "pending") {
    conditions.push(isNull(followUps.completedAt), gte(followUps.dueAt, now));
  }

  if (filters.status === "completed") {
    conditions.push(isNotNull(followUps.completedAt));
  }

  if (filters.status === "overdue") {
    conditions.push(isNull(followUps.completedAt), lt(followUps.dueAt, now));
  }

  const whereCondition = and(...conditions);

  const offset = (filters.page - 1) * filters.limit;

  // Fetch the actual follow-up records.
  const data = await db
    .select()
    .from(followUps)
    .where(whereCondition)
    .orderBy(asc(followUps.dueAt))
    .limit(filters.limit)
    .offset(offset);

  // Count matching records for pagination.
  const [countResult] = await db
    .select({ total: count() })
    .from(followUps)
    .where(whereCondition);

  const total = countResult.total;

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page * filters.limit < total,
      hasPreviousPage: filters.page > 1,
    },
  };
}

export async function getFollowUpById(followUpId, currentUser) {
  const conditions = [
    eq(followUps.id, followUpId),
    eq(followUps.organizationId, currentUser.organizationId),
  ];

  if (currentUser.role === "agent") {
    conditions.push(eq(followUps.assignedTo, currentUser.sub));
  }

  const [followUp] = await db
    .select()
    .from(followUps)
    .where(and(...conditions))
    .limit(1);

  return followUp ?? null;
}

export async function completeFollowUp(followUpId, currentUser) {
  return db.transaction(async (tx) => {
    const conditions = [
      eq(followUps.id, followUpId),
      eq(followUps.organizationId, currentUser.organizationId),
    ];

    if (currentUser.role === "agent") {
      conditions.push(eq(followUps.assignedTo, currentUser.sub));
    }

    // STEP 1: Find and lock the follow-up.
    const [followUp] = await tx
      .select()
      .from(followUps)
      .where(and(...conditions))
      .limit(1)
      .for("update");

    if (!followUp) {
      return { status: "not_found" };
    }

    // STEP 2: Check whether it is already completed.
    if (followUp.completedAt) {
      return { status: "already_completed" };
    }

    // STEP 3: Record completion time.
    const [updatedFollowUp] = await tx
      .update(followUps)
      .set({
        completedAt: new Date(),
      })
      .where(eq(followUps.id, followUpId))
      .returning();

    return {
      status: "success",
      followUp: updatedFollowUp,
    };
  });
}
