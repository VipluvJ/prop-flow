import { z } from "zod";

// VALIDATE LEAD ID
export const leadIdParamSchema = z.object({
  id: z.string().uuid(),
});

// VALIDATE ASSIGNMENT BODY
export const assignLeadSchema = z.object({
  agentId: z.string().uuid(),
});
