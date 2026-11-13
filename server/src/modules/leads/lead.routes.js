import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";

import {
  getLeadById,
  getLeads,
  createLead,
  updateLead,
  deleteLead,
} from "./leads.controller.js";

import {
  createLeadSchema,
  listLeadsQuerySchema,
  leadIdParamSchema,
  updateLeadSchema,
} from "./leads.validation.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin", "agent"),
  validate(createLeadSchema),
  createLead,
);

router.get(
  "/",
  authenticate,
  authorize("admin", "agent"),
  validate(listLeadsQuerySchema, "query"),
  getLeads,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin", "agent"),
  validate(leadIdParamSchema, "params"),
  getLeadById,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin", "agent"),
  validate(leadIdParamSchema, "params"),
  validate(updateLeadSchema),
  updateLead,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "agent"),
  validate(leadIdParamSchema, "params"),
  deleteLead,
);
export default router;
