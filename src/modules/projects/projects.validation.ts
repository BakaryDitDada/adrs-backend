import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createProjectSchema = z.object({
  _id: z.string().regex(objectIdRegex).optional().nullable(),
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  description: z.string().optional(),
  startDate: z.string().refine(d => !isNaN(Date.parse(d))),
  endDate: z.string().refine(d => !isNaN(Date.parse(d))).optional(),
  status: z.enum(['Planifié', 'En cours', 'Terminé', 'Annulé/Suspendu']).optional(),
  budget: z.number().positive().optional(),
  currency: z.string().default('XOF'),
  manager: z.string().regex(objectIdRegex),
  // teamMembers: z.string().optional(), // comma-separated IDs
  teamMembers: z.array(z.string().regex(objectIdRegex, "Invalid ObjectId in teamMembers")).optional(),
  tasks: z.array(z.string().regex(objectIdRegex, "Invalid ObjectId in tasks")).optional(),
  attachments: z.array(z.string().regex(objectIdRegex, "Invalid ObjectId in attachments")).optional(),
  fundingSources: z.object({
    name: z.string().min(1, "Partner name required"),
    amount: z.number().positive(),
  }).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectBulkCreateSchema = z.object({
  projects: z.array(createProjectSchema),
});

export const projectBulkUpdateSchema = z.object({
  projects: z.array(createProjectSchema.partial()),
});

export type ProjectCreateInput = z.infer<typeof createProjectSchema>;
export type ProjectUpdateInput = z.infer<typeof updateProjectSchema>;
export type ProjectBulkCreateInput = z.infer<typeof projectBulkCreateSchema>;
export type ProjectBulkUpdateInput = z.infer<typeof projectBulkUpdateSchema>;