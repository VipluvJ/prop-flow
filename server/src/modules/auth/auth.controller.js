import {
  registerOrganization,
  loginUser,
  refreshSession,
} from "./auth.service.js";
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  getRefreshCookieClearOptions,
} from "./auth.cookie.js";
import { logoutUser } from "./auth.service.js";
export async function register(req, res) {
  try {
    const result = await registerOrganization(req.validated.body);

    return res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      data: result,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email or organization slug already exists",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration",
    });
  }
}

export async function login(req, res) {
  try {
    // 1. Get validated request data
    const { email, password } = req.validated.body;

    // 2. Authenticate user
    const result = await loginUser({ email, password });

    // 3. Handle invalid credentials
    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Handle inactive account
    if (result.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // 5. Extract refresh token
    const { refreshToken, ...responseData } = result;

    // 6. Set refresh token as an HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // 7. Return access token and user details
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: responseData.accessToken,
        user: responseData.user,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
    });
  }
}

export async function refresh(req, res) {
  try {
    // 1. Read refresh token from the browser cookie
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    // 2. Validate and rotate the refresh token
    const result = await refreshSession(refreshToken);

    // 3. Handle invalid, expired or revoked tokens
    if (!result) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // 4. Handle inactive account
    if (result.status === "inactive") {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // 5. Extract the new refresh token
    const { refreshToken: newRefreshToken, ...responseData } = result;

    // 6. Set the replacement refresh token cookie
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    // 7. Return the new access token
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: responseData.accessToken,
        user: responseData.user,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while refreshing token",
    });
  }
}

export async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await logoutUser(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions());

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during logout",
    });
  }
}
