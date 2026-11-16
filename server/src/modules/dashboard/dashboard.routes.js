import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { getDashboard } from "./dashboard.controller.js";

const router = Router();

// Every dashboard request requires authentication.
router.use(authenticate);

// GET /api/dashboard
router.get("/", getDashboard);

export default router;
