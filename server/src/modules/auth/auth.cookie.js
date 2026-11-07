import { env } from "../../config/env.js";
import { getRefreshTokenMaxAge } from "../../utils/tokens.js";

export const REFRESH_COOKIE_NAME = "refreshToken";

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: getRefreshTokenMaxAge(),
  };
}
export function getRefreshCookieClearOptions() {
  const { maxAge, ...options } = getRefreshCookieOptions();

  return options;
}
