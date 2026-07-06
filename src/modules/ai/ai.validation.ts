import { z } from 'zod';

export const chatSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().min(1),
});

export const generateReportSchema = z.object({
  type: z.enum(['project_status']),
  relatedId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});