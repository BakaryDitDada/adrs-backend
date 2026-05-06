// src/modules/payroll/payroll.validator.ts
import { z } from 'zod';

const dateString = z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date' });

export const createPayrollBatchSchema = z.object({
  employeeIds: z.array(z.string()).optional(),
  payPeriodStart: dateString,
  payPeriodEnd: dateString,
  paymentDate: dateString,
  customData: z.record(z.string(), z.any()).optional(),
});

export const updatePayrollSchema = z.object({
  status: z.enum(['En attente', 'Payé', 'Annulé']).optional(),
  paymentMethod: z.enum(['Banque', 'Espèces', 'Chèque']).optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: dateString.optional(),
});

export const batchUpdateSchema = z.object({
  payrollIds: z.array(z.string().min(1)),
  status: z.enum(['En attente', 'Payé', 'Annulé']).optional(),
  paymentMethod: z.enum(['Banque', 'Espèces', 'Chèque']).optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: dateString.optional(),
});

export const batchCancelSchema = z.object({
  payrollIds: z.array(z.string().min(1)),
  reason: z.string().optional(),
});

export const getPayrollsQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.string().optional(),
  fromDate: dateString.optional(),
  toDate: dateString.optional(),
  page: z.string().regex(/^\d+$/).optional().transform(Number),
  limit: z.string().regex(/^\d+$/).optional().transform(Number),
});