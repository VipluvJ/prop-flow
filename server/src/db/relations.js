import { relations } from "drizzle-orm";

import {
  organizations,
  users,
  projects,
  leads,
  leadAssignments,
  leadActivities,
  followUps,
  refreshTokens,
} from "./schema.js";

// ORGANIZATIONS
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  leads: many(leads),
}));

// USERS
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),

  createdLeads: many(leads, {
    relationName: "leadCreator",
  }),

  assignedLeads: many(leads, {
    relationName: "leadAssignee",
  }),

  leadsAssignedBy: many(leads, {
    relationName: "leadAssigner",
  }),

  assignmentsMade: many(leadAssignments, {
    relationName: "assignmentActor",
  }),

  assignmentsReceived: many(leadAssignments, {
    relationName: "assignmentRecipient",
  }),

  assignmentsPreviouslyOwned: many(leadAssignments, {
    relationName: "assignmentPreviousAgent",
  }),

  activities: many(leadActivities),

  followUps: many(followUps),

  refreshTokens: many(refreshTokens),
}));

// PROJECTS
export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),

  leads: many(leads),
}));

// LEADS
export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leads.organizationId],
    references: [organizations.id],
  }),

  project: one(projects, {
    fields: [leads.organizationId, leads.projectId],
    references: [projects.organizationId, projects.id],
  }),

  creator: one(users, {
    fields: [leads.organizationId, leads.createdBy],
    references: [users.organizationId, users.id],
    relationName: "leadCreator",
  }),

  assignee: one(users, {
    fields: [leads.organizationId, leads.assignedTo],
    references: [users.organizationId, users.id],
    relationName: "leadAssignee",
  }),

  assignedBy: one(users, {
    fields: [leads.organizationId, leads.assignedBy],
    references: [users.organizationId, users.id],
    relationName: "leadAssigner",
  }),

  assignments: many(leadAssignments),

  activities: many(leadActivities),

  followUps: many(followUps),
}));

// LEAD ASSIGNMENTS
export const leadAssignmentsRelations = relations(
  leadAssignments,
  ({ one }) => ({
    lead: one(leads, {
      fields: [leadAssignments.organizationId, leadAssignments.leadId],
      references: [leads.organizationId, leads.id],
    }),

    previousAgent: one(users, {
      fields: [
        leadAssignments.organizationId,
        leadAssignments.previousAssignedTo,
      ],
      references: [users.organizationId, users.id],
      relationName: "assignmentPreviousAgent",
    }),

    newAgent: one(users, {
      fields: [leadAssignments.organizationId, leadAssignments.newAssignedTo],
      references: [users.organizationId, users.id],
      relationName: "assignmentRecipient",
    }),

    assignedBy: one(users, {
      fields: [leadAssignments.organizationId, leadAssignments.assignedBy],
      references: [users.organizationId, users.id],
      relationName: "assignmentActor",
    }),
  }),
);

// LEAD ACTIVITIES
export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.organizationId, leadActivities.leadId],
    references: [leads.organizationId, leads.id],
  }),

  user: one(users, {
    fields: [leadActivities.organizationId, leadActivities.userId],
    references: [users.organizationId, users.id],
  }),
}));

// FOLLOW UPS
export const followUpsRelations = relations(followUps, ({ one }) => ({
  lead: one(leads, {
    fields: [followUps.organizationId, followUps.leadId],
    references: [leads.organizationId, leads.id],
  }),

  assignedTo: one(users, {
    fields: [followUps.organizationId, followUps.assignedTo],
    references: [users.organizationId, users.id],
  }),
}));

// REFRESH TOKENS
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
