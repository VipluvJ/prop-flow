import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";

import {
  getFollowUps,
  getFollowUpById,
  completeFollowUp,
} from "./follow-ups.controller.js";

import {
  listFollowUpsQuerySchema,
  followUpIdParamSchema,
  completeFollowUpSchema,
} from "./follow-ups.validation.js";

const router = Router();

// All follow-up routes require authentication.
router.use(authenticate);

// GET ALL FOLLOW-UPS
router.get("/", validate(listFollowUpsQuerySchema, "query"), getFollowUps);

// GET FOLLOW-UP BY ID
router.get("/:id", validate(followUpIdParamSchema, "params"), getFollowUpById);

// COMPLETE FOLLOW-UP
router.patch(
  "/:id/complete",
  validate(followUpIdParamSchema, "params"),
  validate(completeFollowUpSchema),
  completeFollowUp,
);

export default router;
