import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTaskSchema = z.object({
  _id: z.string().regex(objectIdRegex).optional(),
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  type: z.enum(['Réunion', 'Mission de Terrain', 'Atelier de Formation', 'Tâche de Bureau', 'Autre']).optional(),
  status: z.enum(['A Faire', 'En Cours', 'Terminé']).optional(),
  percentage: z.number().min(0).max(100).optional(),
  priority: z.enum(['Elevée', 'Médium', 'Bas']).optional(),
  assignedTo: z.array(z.string().regex(objectIdRegex, "Invalid ObjectId in teamMembers")).optional(),
  attachments: z.array(z.string().regex(objectIdRegex, "Invalid ObjectId in attachments")).optional(),
  startDate: z.string().refine(d => !isNaN(Date.parse(d))),
  dueDate: z.string().refine(d => !isNaN(Date.parse(d))).optional(),
  projectId: z.string().regex(objectIdRegex).optional(),
  categories: z.string().optional(),
  notes: z.string().min(20).max(500).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskBulkCreateSchema = z.object({
  tasks: z.array(createTaskSchema),
});

export const taskBulkUpdateSchema = z.object({
  tasks: z.array(createTaskSchema.partial()),
});

export type TaskCreateInput = z.infer<typeof createTaskSchema>;
export type TaskUpdateInput = z.infer<typeof updateTaskSchema>;
export type TaskBulkCreateInput = z.infer<typeof taskBulkCreateSchema>;
export type TaskBulkUpdateInput = z.infer<typeof taskBulkUpdateSchema>;