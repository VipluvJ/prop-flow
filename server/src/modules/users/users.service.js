import { and, eq, ilike, or, desc, count, ne } from "drizzle-orm";

import argon2 from "argon2";

import { db } from "../../db/index.js";
import { users, organizations } from "../../db/schema.js";

// Create a new user
export async function createUser(data, currentUser) {
  const email = data.email.toLowerCase();

  // 1. Hash the password before storing it.
  const passwordHash = await argon2.hash(data.password);

  try {
    // 2. Insert the new user.
    const [newUser] = await db
      .insert(users)
      .values({
        organizationId: currentUser.organizationId,
        name: data.name,
        email,
        passwordHash,
        role: "agent",
      })
      .returning({
        id: users.id,
        organizationId: users.organizationId,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return newUser;
  } catch (error) {
    // PostgreSQL error code 23505 means unique constraint violation.
    if (error.code === "23505") {
      return { status: "email_taken" };
    }

    throw error;
  }
}

// List users belonging to the current organization
export async function getUsers(filters, currentUser) {
  // 1. Every query must be restricted to the current organization.
  const conditions = [eq(users.organizationId, currentUser.organizationId)];

  // 2. Apply optional role filter.
  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  // 3. Apply optional active/inactive filter.
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive === "true"));
  }

  // 4. Apply optional search across name and email.
  if (filters.search) {
    const searchPattern = `%${filters.search}%`;

    conditions.push(
      or(ilike(users.name, searchPattern), ilike(users.email, searchPattern)),
    );
  }

  const whereCondition = and(...conditions);

  // 5. Calculate pagination.
  const offset = (filters.page - 1) * filters.limit;

  // 6. Fetch matching users.
  const data = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereCondition)
    .orderBy(desc(users.createdAt))
    .limit(filters.limit)
    .offset(offset);

  // 7. Count all matching users.
  const [countResult] = await db
    .select({ total: count() })
    .from(users)
    .where(whereCondition);

  const total = countResult.total;

  // 8. Return users and pagination details.
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

export async function getUserById(userId, currentUser) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.organizationId, currentUser.organizationId),
      ),
    )
    .limit(1);

  return user ?? null;
}

export async function updateUser(userId, data, currentUser) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return updatedUser ?? null;
  } catch (error) {
    if (error.code === "23505") {
      return { status: "email_taken" };
    }

    throw error;
  }
}

export async function changeUserRole(userId, newRole, currentUser) {
  return db.transaction(async (tx) => {
    // 1. Lock the organization row.
    // All admin role/status changes must acquire this lock first.
    await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, currentUser.organizationId))
      .for("update");

    // 1. Find the target user within the current organization.
    const [targetUser] = await tx
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .limit(1)
      .for("update");

    if (!targetUser) {
      return null;
    }

    // 2. If an active admin is being demoted,
    // check whether another active admin exists.
    if (
      targetUser.role === "admin" &&
      targetUser.isActive &&
      newRole !== "admin"
    ) {
      const [otherAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.organizationId, currentUser.organizationId),
            eq(users.role, "admin"),
            eq(users.isActive, true),
            ne(users.id, userId),
          ),
        )
        .limit(1);

      // 3. Prevent removing the last active admin.
      if (otherAdmin && otherAdmin.id === targetUser.id) {
        return { status: "last_admin" };
      }
    }

    // 4. Update the role.
    const [updatedUser] = await tx
      .update(users)
      .set({ role: newRole })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return updatedUser;
  });
}

export async function updateUserStatus(userId, isActive, currentUser) {
  return db.transaction(async (tx) => {
    // 1. Lock the organization row.
    await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, currentUser.organizationId))
      .for("update");

    // 1. Find the target user and lock the row.
    const [targetUser] = await tx
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .limit(1)
      .for("update");

    if (!targetUser) {
      return null;
    }

    // 2. Prevent an admin from deactivating themselves.
    if (targetUser.id === currentUser.sub && isActive === false) {
      return { status: "self_deactivation" };
    }

    // 3. Protect the last active admin.
    if (
      targetUser.role === "admin" &&
      targetUser.isActive &&
      isActive === false
    ) {
      const [otherAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.organizationId, currentUser.organizationId),
            eq(users.role, "admin"),
            eq(users.isActive, true),
            ne(users.id, userId),
          ),
        )
        .limit(1);

      if (!otherAdmin) {
        return { status: "last_admin" };
      }
    }

    // 4. Update the user's active status.
    const [updatedUser] = await tx
      .update(users)
      .set({ isActive })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, currentUser.organizationId),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return updatedUser;
  });
}
