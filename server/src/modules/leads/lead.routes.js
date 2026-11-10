import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";

import { createLead } from "./leads.controller.js";
import { createLeadSchema } from "./leads.validation.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin", "agent"),
  validate(createLeadSchema),
  createLead,
);

export default router;
