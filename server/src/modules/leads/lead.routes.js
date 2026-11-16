import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";

import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from "./leads.controller.js";

import {
  createLeadSchema,
  listLeadsQuerySchema,
  leadIdParamSchema,
  updateLeadSchema,
} from "./leads.validation.js";

import { assignLead } from "../assignments/assignments.controller.js";
import { assignLeadSchema } from "../assignments/assignments.validation.js";

import {
  createActivity,
  getLeadActivities,
} from "../activities/activities.controller.js";

import { createActivitySchema } from "../activities/activities.validation.js";

import { createFollowUp } from "../follow-ups/follow-ups.controller.js";

import { createFollowUpSchema } from "../follow-ups/follow-ups.validation.js";

const router = Router();

// All lead routes require authentication.
router.use(authenticate);

// CREATE LEAD
router.post("/", validate(createLeadSchema), createLead);

// GET ALL LEADS
router.get("/", validate(listLeadsQuerySchema, "query"), getLeads);

// ASSIGN / REASSIGN LEAD (ADMIN ONLY)
router.patch(
  "/:id/assign",
  authorize("admin"),
  validate(leadIdParamSchema, "params"),
  validate(assignLeadSchema),
  assignLead,
);

// GET LEAD BY ID
router.get("/:id", validate(leadIdParamSchema, "params"), getLeadById);

// UPDATE LEAD
router.patch(
  "/:id",
  validate(leadIdParamSchema, "params"),
  validate(updateLeadSchema),
  updateLead,
);

// DELETE LEAD (SOFT DELETE)
router.delete("/:id", validate(leadIdParamSchema, "params"), deleteLead);

// CREATE LEAD ACTIVITY
router.post(
  "/:id/activities",
  validate(leadIdParamSchema, "params"),
  validate(createActivitySchema),
  createActivity,
);

// GET LEAD ACTIVITY HISTORY
router.get(
  "/:id/activities",
  validate(leadIdParamSchema, "params"),
  getLeadActivities,
);

// CREATE FOLLOW-UP FOR A LEAD
router.post(
  "/:id/follow-ups",
  validate(leadIdParamSchema, "params"),
  validate(createFollowUpSchema),
  createFollowUp,
);

export default router;
