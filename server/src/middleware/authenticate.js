import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export async function authenticate(req, res, next) {
  let decoded;

  // STEP 1: Verify the access token
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const match = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header",
      });
    }

    const token = match[1];

    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded !== "object" ||
      !decoded.sub ||
      !decoded.organizationId ||
      !["admin", "agent"].includes(decoded.role)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }

  // STEP 2: Check the user's current database record
  try {
    const [user] = await db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(
        and(
          eq(users.id, decoded.sub),
          eq(users.organizationId, decoded.organizationId),
        ),
      )
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is inactive or no longer exists",
      });
    }

    // STEP 3: Attach current database information to the request
    req.user = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
