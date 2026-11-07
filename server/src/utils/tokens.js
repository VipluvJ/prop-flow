import { randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";

export function generateRefreshToken() {
  return randomBytes(64).toString("hex");
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenMaxAge() {
  const match = /^(\d+)(s|m|h|d)$/.exec(env.REFRESH_TOKEN_EXPIRES_IN);

  if (!match) {
    throw new Error("Invalid REFRESH_TOKEN_EXPIRES_IN format");
  }

  const value = Number(match[1]);
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * units[match[2]];
}

export function generateAccessToken(user) {
  return jwt.sign(
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
}
