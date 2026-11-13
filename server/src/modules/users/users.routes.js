import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changeUserRole,
  updateUserStatus,
} from "./users.controller.js";

import {
  createUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserSchema,
  changeUserRoleSchema,
  updateUserStatusSchema,
} from "./users.validation.js";

const router = Router();

// All routes require an authenticated admin.
router.use(authenticate, authorize("admin"));

// CREATE USER
router.post("/", validate(createUserSchema), createUser);

// GET ALL USERS
router.get("/", validate(listUsersQuerySchema, "query"), getUsers);

// GET USER BY ID
router.get("/:id", validate(userIdParamSchema, "params"), getUserById);

// UPDATE USER DETAILS
router.patch(
  "/:id",
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema),
  updateUser,
);

// CHANGE USER ROLE
router.patch(
  "/:id/role",
  validate(userIdParamSchema, "params"),
  validate(changeUserRoleSchema),
  changeUserRole,
);

// ACTIVATE / DEACTIVATE USER
router.patch(
  "/:id/status",
  validate(userIdParamSchema, "params"),
  validate(updateUserStatusSchema),
  updateUserStatus,
);

export default router;
