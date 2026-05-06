import { z } from 'zod';

export const dashboardPeriodSchema = z.enum(['7d', '30d', '90d', '6m', '12m']);

export const dashboardSummaryQuerySchema = z.object({});

export const dashboardOverviewQuerySchema = z.object({});

export const dashboardTrendQuerySchema = z.object({
  period: dashboardPeriodSchema.default('12m'),
});

export const dashboardWorkloadQuerySchema = z.object({
  period: dashboardPeriodSchema.default('12m'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});