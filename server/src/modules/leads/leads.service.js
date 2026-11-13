import { and, eq, ilike, or, desc, count, isNull, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { leads, projects, leadAssignments } from "../../db/schema.js";

export async function createLead(data, user) {
  return db.transaction(async (tx) => {
    // 1. Verify that the project belongs to this organization.
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, data.projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!project) {
      return null;
    }

    // 2. Automatically assign leads created by agents to themselves.
    const assignedTo = user.role === "agent" ? user.sub : null;
    const assignedAt = assignedTo ? new Date() : null;

    // 3. Insert the lead.
    const [lead] = await tx
      .insert(leads)
      .values({
        ...data,
        organizationId: user.organizationId,
        createdBy: user.sub,
        assignedTo,
        assignedBy: assignedTo ? user.sub : null,
        assignedAt,
      })
      .returning();

    // 4. Record the initial assignment in assignment history.
    if (assignedTo) {
      await tx.insert(leadAssignments).values({
        organizationId: user.organizationId,
        leadId: lead.id,
        previousAssignedTo: null,
        newAssignedTo: assignedTo,
        assignedBy: user.sub,
      });
    }

    return lead;
  });
}

export async function getLeads(filters, user) {
  // 1. Start with mandatory security conditions.
  const conditions = [
    eq(leads.organizationId, user.organizationId),
    isNull(leads.deletedAt),
  ];

  // 2. Restrict agents to their own assigned leads.
  if (user.role === "agent") {
    conditions.push(eq(leads.assignedTo, user.sub));
  }

  // 3. Apply optional status filter.
  if (filters.status) {
    conditions.push(eq(leads.status, filters.status));
  }

  // 4. Apply optional project filter.
  if (filters.projectId) {
    conditions.push(eq(leads.projectId, filters.projectId));
  }

  // 5. Apply optional search across name, phone and email.
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;

    conditions.push(
      or(
        ilike(leads.name, searchPattern),
        ilike(leads.phone, searchPattern),
        ilike(leads.email, searchPattern),
      ),
    );
  }

  // 6. Combine all conditions into one WHERE clause.
  const whereCondition = and(...conditions);

  // 7. Calculate pagination.
  const offset = (filters.page - 1) * filters.limit;

  // 8. Fetch the matching leads.
  const data = await db
    .select()
    .from(leads)
    .where(whereCondition)
    .orderBy(desc(leads.createdAt))
    .limit(filters.limit)
    .offset(offset);

  // 9. Count all matching leads (without pagination).
  const [countResult] = await db
    .select({ total: count() })
    .from(leads)
    .where(whereCondition);

  const total = countResult.total;

  // 10. Return records and pagination information.
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

export async function getLeadById(leadId, user) {
  const conditions = [
    eq(leads.id, leadId),
    eq(leads.organizationId, user.organizationId),
    isNull(leads.deletedAt),
  ];

  if (user.role === "agent") {
    conditions.push(eq(leads.assignedTo, user.sub));
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(...conditions))
    .limit(1);

  return lead ?? null;
}

export async function updateLead(leadId, data, user) {
  const conditions = [
    eq(leads.id, leadId),
    eq(leads.organizationId, user.organizationId),
    isNull(leads.deletedAt),
  ];

  if (user.role === "agent") {
    conditions.push(eq(leads.assignedTo, user.sub));

    if (data.projectId !== undefined) {
      return { status: "forbidden" };
    }
  }

  if (data.projectId !== undefined) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, data.projectId),
          eq(projects.organizationId, user.organizationId),
        ),
      )
      .limit(1);

    if (!project) {
      return { status: "project_not_found" };
    }
  }

  const [lead] = await db
    .update(leads)
    .set({
      ...data,
      updatedAt: new Date(),
      version: sql`${leads.version} + 1`,
    })
    .where(and(...conditions))
    .returning();

  return lead ?? null;
}

export async function deleteLead(leadId, user) {
  const conditions = [
    eq(leads.id, leadId),
    eq(leads.organizationId, user.organizationId),
    isNull(leads.deletedAt),
  ];

  if (user.role === "agent") {
    conditions.push(eq(leads.assignedTo, user.sub));
  }

  const [lead] = await db
    .update(leads)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      version: sql`${leads.version} + 1`,
    })
    .where(and(...conditions))
    .returning();

  return lead ?? null;
}

export async function getProjectById(projectId, currentUser) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, currentUser.organizationId),
      ),
    )
    .limit(1);

  return project ?? null;
}

export async function updateProject(projectId, data, currentUser) {
  const [updatedProject] = await db
    .update(projects)
    .set({
      ...data,
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, currentUser.organizationId),
      ),
    )
    .returning();

  return updatedProject ?? null;
}
