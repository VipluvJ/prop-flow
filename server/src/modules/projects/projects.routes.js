import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
} from "./projects.controller.js";

import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "./projects.validations.js";

const router = Router();

// CREATE PROJECT
router.post("/", validate(createProjectSchema), createProject);

// GET ALL PROJECTS
router.get("/", validate(listProjectsQuerySchema, "query"), getProjects);

// GET PROJECT BY ID
router.get("/:id", validate(projectIdParamSchema, "params"), getProjectById);

// UPDATE PROJECT
router.patch(
  "/:id",
  validate(projectIdParamSchema, "params"),
  validate(updateProjectSchema),
  updateProject,
);

export default router;
