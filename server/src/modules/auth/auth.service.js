import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { db } from "../../db/index.js";
import { refreshTokens, organizations, users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

import {
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenMaxAge,
  generateAccessToken,
} from "../../utils/tokens.js";

export async function registerOrganization(data) {
  const normalizedEmail = data.email.toLowerCase();

  // Hash the password before starting the transaction.
  const passwordHash = await argon2.hash(data.password);

  // Generate a unique organization slug.
  const slugBase = data.organizationName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;

  // Create organization and first Admin atomically.
  const result = await db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: data.organizationName,
        slug,
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      });

    const [user] = await tx
      .insert(users)
      .values({
        organizationId: organization.id,
        name: data.name,
        email: normalizedEmail,
        passwordHash,
        role: "admin",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        organizationId: users.organizationId,
      });

    return { organization, user };
  });

  return result;
}

export async function loginUser(data) {
  const normalizedEmail = data.email.toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    return null;
  }

  const passwordMatches = await argon2.verify(user.passwordHash, data.password);

  if (!passwordMatches) {
    return null;
  }

  if (!user.isActive) {
    return { status: "inactive" };
  }

  // Generate access token
  const accessToken = jwt.sign(
    {
      organizationId: user.organizationId,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.id,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  );

  // Generate refresh token
  const refreshToken = generateRefreshToken();

  // Hash it before storing in the database
  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + getRefreshTokenMaxAge());

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    status: "success",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}

export async function refreshSession(rawRefreshToken) {
  const tokenHash = hashRefreshToken(rawRefreshToken);

  return db.transaction(async (tx) => {
    // 1. Find and lock the existing refresh-token record
    const [storedToken] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .for("update")
      .limit(1);

    // 2. Check whether the token exists
    if (!storedToken) {
      return null;
    }

    // 3. Check whether it has already been revoked
    if (storedToken.revokedAt) {
      return null;
    }

    // 4. Check whether it has expired
    const now = new Date();

    if (storedToken.expiresAt <= now) {
      return null;
    }

    // 5. Find the user associated with this token
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, storedToken.userId))
      .limit(1);

    // 6. Check whether the account is still active
    if (!user || !user.isActive) {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(eq(refreshTokens.id, storedToken.id));

      return { status: "inactive" };
    }

    // 7. Revoke the old refresh token
    await tx
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(eq(refreshTokens.id, storedToken.id));

    // 8. Generate a replacement refresh token
    const newRefreshToken = generateRefreshToken();

    const newTokenHash = hashRefreshToken(newRefreshToken);

    const expiresAt = new Date(Date.now() + getRefreshTokenMaxAge());

    // 9. Store the replacement token's hash
    await tx.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    // 10. Generate a new access token
    const accessToken = generateAccessToken(user);

    return {
      status: "success",
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  });
}

export async function logoutUser(rawRefreshToken) {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      ),
    );
}
