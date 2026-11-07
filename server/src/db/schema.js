import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";

// --------------------------------------------------
// ENUMS
// --------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "agent"]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "site_visit",
  "negotiation",
  "booked",
  "lost",
  "unqualified",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "note",
  "status_change",
  "site_visit",
]);

// --------------------------------------------------
// ORGANIZATIONS
// --------------------------------------------------

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 150 }).notNull(),

  slug: varchar("slug", { length: 100 }).notNull().unique(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

// --------------------------------------------------
// USERS
// --------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    name: varchar("name", { length: 120 }).notNull(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    passwordHash: text("password_hash").notNull(),

    role: userRoleEnum("role").notNull().default("agent"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("users_org_id_id_unique").on(table.organizationId, table.id),
    index("users_org_role_idx").on(table.organizationId, table.role),
  ],
);

// --------------------------------------------------
// PROJECTS
// --------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    name: varchar("name", { length: 150 }).notNull(),

    location: varchar("location", { length: 255 }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("projects_org_id_id_unique").on(table.organizationId, table.id),
    index("projects_org_idx").on(table.organizationId),
  ],
);

// --------------------------------------------------
// LEADS
// --------------------------------------------------

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    name: varchar("name", { length: 120 }).notNull(),

    phone: varchar("phone", { length: 20 }).notNull(),

    email: varchar("email", { length: 255 }),

    projectId: uuid("project_id").notNull(),

    propertyType: varchar("property_type", { length: 100 }),

    budget: numeric("budget", {
      precision: 12,
      scale: 2,
    }),

    source: varchar("source", { length: 100 }),

    status: leadStatusEnum("status").notNull().default("new"),

    assignedTo: uuid("assigned_to"),

    createdBy: uuid("created_by").notNull(),

    assignedBy: uuid("assigned_by"),

    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
    }),

    // Used to detect stale updates and concurrent changes.
    version: integer("version").notNull().default(1),

    // Soft deletion: retain the record instead of removing it.
    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("leads_org_id_unique").on(table.organizationId, table.id),

    index("leads_org_phone_idx").on(table.organizationId, table.phone),

    foreignKey({
      name: "leads_org_project_fk",
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
    }),

    foreignKey({
      name: "leads_org_assigned_to_fk",
      columns: [table.organizationId, table.assignedTo],
      foreignColumns: [users.organizationId, users.id],
    }),

    foreignKey({
      name: "leads_org_created_by_fk",
      columns: [table.organizationId, table.createdBy],
      foreignColumns: [users.organizationId, users.id],
    }),

    foreignKey({
      name: "leads_org_assigned_by_fk",
      columns: [table.organizationId, table.assignedBy],
      foreignColumns: [users.organizationId, users.id],
    }),

    index("leads_org_assigned_status_idx").on(
      table.organizationId,
      table.assignedTo,
      table.status,
    ),

    index("leads_org_project_idx").on(table.organizationId, table.projectId),
  ],
);

// --------------------------------------------------
// LEAD ASSIGNMENTS
// --------------------------------------------------

export const leadAssignments = pgTable(
  "lead_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id").notNull(),

    leadId: uuid("lead_id").notNull(),

    previousAssignedTo: uuid("previous_assigned_to"),

    newAssignedTo: uuid("new_assigned_to").notNull(),

    assignedBy: uuid("assigned_by").notNull(),

    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "assignments_org_lead_fk",
      columns: [table.organizationId, table.leadId],
      foreignColumns: [leads.organizationId, leads.id],
    }),

    foreignKey({
      name: "assignments_org_previous_user_fk",
      columns: [table.organizationId, table.previousAssignedTo],
      foreignColumns: [users.organizationId, users.id],
    }),

    foreignKey({
      name: "assignments_org_new_user_fk",
      columns: [table.organizationId, table.newAssignedTo],
      foreignColumns: [users.organizationId, users.id],
    }),

    foreignKey({
      name: "assignments_org_assigned_by_fk",
      columns: [table.organizationId, table.assignedBy],
      foreignColumns: [users.organizationId, users.id],
    }),

    index("assignments_org_lead_idx").on(table.organizationId, table.leadId),
  ],
);

// --------------------------------------------------
// LEAD ACTIVITIES
// --------------------------------------------------

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id").notNull(),

    leadId: uuid("lead_id").notNull(),

    userId: uuid("user_id").notNull(),

    type: activityTypeEnum("type").notNull(),

    description: text("description").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "activities_org_lead_fk",
      columns: [table.organizationId, table.leadId],
      foreignColumns: [leads.organizationId, leads.id],
    }),

    foreignKey({
      name: "activities_org_user_fk",
      columns: [table.organizationId, table.userId],
      foreignColumns: [users.organizationId, users.id],
    }),

    index("activities_org_lead_idx").on(table.organizationId, table.leadId),
  ],
);

// --------------------------------------------------
// FOLLOW UPS
// --------------------------------------------------

export const followUps = pgTable(
  "follow_ups",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id").notNull(),

    leadId: uuid("lead_id").notNull(),

    assignedTo: uuid("assigned_to").notNull(),

    note: text("note").notNull(),

    dueAt: timestamp("due_at", {
      withTimezone: true,
    }).notNull(),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "followups_org_lead_fk",
      columns: [table.organizationId, table.leadId],
      foreignColumns: [leads.organizationId, leads.id],
    }),

    foreignKey({
      name: "followups_org_user_fk",
      columns: [table.organizationId, table.assignedTo],
      foreignColumns: [users.organizationId, users.id],
    }),

    index("followups_org_assigned_idx").on(
      table.organizationId,
      table.assignedTo,
    ),

    index("followups_org_due_idx").on(table.organizationId, table.dueAt),
  ],
);

// --------------------------------------------------
// REFRESH TOKENS
// --------------------------------------------------

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("refresh_tokens_user_idx").on(table.userId)],
);
