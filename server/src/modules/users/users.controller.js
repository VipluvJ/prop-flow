import {
  createUser as createUserService,
  getUsers as getUsersService,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  changeUserRole as changeUserRoleService,
  updateUserStatus as updateUserStatusService,
} from "./users.service.js";

// CREATE USER
export async function createUser(req, res, next) {
  try {
    const data = req.validated.body;

    const newUser = await createUserService(data, req.user);

    if (newUser.status === "email_taken") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
}

// GET ALL USERS
export async function getUsers(req, res, next) {
  try {
    const filters = req.validated.query;

    const result = await getUsersService(filters, req.user);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

// GET USER BY ID
export async function getUserById(req, res, next) {
  try {
    const { id } = req.validated.params;

    const user = await getUserByIdService(id, req.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// UPDATE USER DETAILS
export async function updateUser(req, res, next) {
  try {
    const { id } = req.validated.params;
    const data = req.validated.body;

    const user = await updateUserService(id, data, req.user);

    if (user?.status === "email_taken") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// CHANGE USER ROLE
export async function changeUserRole(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { role } = req.validated.body;

    const user = await changeUserRoleService(id, role, req.user);

    if (user?.status === "last_admin") {
      return res.status(409).json({
        success: false,
        message: "Cannot remove the last active admin from the organization",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// ACTIVATE / DEACTIVATE USER
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { isActive } = req.validated.body;

    const user = await updateUserStatusService(id, isActive, req.user);

    if (user?.status === "self_deactivation") {
      return res.status(403).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    if (user?.status === "last_admin") {
      return res.status(409).json({
        success: false,
        message: "Cannot deactivate the last active admin",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
