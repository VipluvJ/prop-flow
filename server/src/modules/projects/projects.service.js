import { and, eq, ilike, or, desc, count } from "drizzle-orm";

import { db } from "../../db/index.js";
import { projects } from "../../db/schema.js";

export async function createProject(data, currentUser) {
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: currentUser.organizationId,
      name: data.name,
      location: data.location,
    })
    .returning();

  return project;
}

export async function getProjects(filters, currentUser) {
  const conditions = [eq(projects.organizationId, currentUser.organizationId)];

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;

    conditions.push(
      or(
        ilike(projects.name, searchPattern),
        ilike(projects.location, searchPattern),
      ),
    );
  }

  const whereCondition = and(...conditions);
  const offset = (filters.page - 1) * filters.limit;

  const data = await db
    .select()
    .from(projects)
    .where(whereCondition)
    .orderBy(desc(projects.createdAt))
    .limit(filters.limit)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(projects)
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
