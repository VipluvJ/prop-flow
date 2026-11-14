import { assignLead } from "../assignments/assignments.controller.js";
import { assignLeadSchema } from "../assignments/assignments.validation.js";

// ASSIGN / REASSIGN LEAD
router.patch(
  "/:id/assign",
  authorize("admin"),
  validate(leadIdParamSchema, "params"),
  validate(assignLeadSchema),
  assignLead,
);
