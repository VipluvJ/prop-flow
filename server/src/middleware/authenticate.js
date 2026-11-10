import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authenticate(req, res, next) {
  try {
    // 1. Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 2. Extract Bearer token
    const match = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = match[1];

    // 3. Verify JWT
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    });

    // 4. Validate required JWT claims
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

    // 5. Attach authenticated user to request
    req.user = {
      sub: decoded.sub,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };

    // 6. Continue to the next middleware/controller
    next();
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
}
