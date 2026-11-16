import { z } from "zod";

// CREATE FOLLOW-UP
export const createFollowUpSchema = z.object({
  assignedTo: z.string().uuid().optional(),
  note: z.string().trim().min(1).max(2000),
  dueAt: z.coerce.date(),
});

// LIST FOLLOW-UPS
export const listFollowUpsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["pending", "completed", "overdue"]).optional(),
  leadId: z.string().uuid().optional(),
});

// FOLLOW-UP ID
export const followUpIdParamSchema = z.object({
  id: z.string().uuid(),
});

// MARK FOLLOW-UP AS COMPLETED
export const completeFollowUpSchema = z.object({}).strict();
