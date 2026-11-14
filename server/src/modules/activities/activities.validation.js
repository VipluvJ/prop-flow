import { z } from "zod";

// CREATE ACTIVITY
export const createActivitySchema = z.object({
  type: z.enum(["call", "note", "status_change", "site_visit"]),
  description: z.string().trim().min(1).max(2000),
});
