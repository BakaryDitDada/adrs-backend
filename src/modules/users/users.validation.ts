import { z } from "zod";

export const userCreateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['super_admin', 'admin', 'user', 'employee', 'hr', 'manager']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  service_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

export const userUpdateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email("Valid email required").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(['super_admin', 'admin', 'user', 'employee', 'hr', 'manager']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  service_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

export const userBulkCreateSchema = z.object({
  users: z.array(userCreateSchema)
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserBulkCreateInput = z.infer<typeof userBulkCreateSchema>;