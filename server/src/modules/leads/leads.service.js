import { and, eq } from "drizzle-orm";

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
