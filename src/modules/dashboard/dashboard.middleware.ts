import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { dashboardPeriodSchema, dashboardSummaryQuerySchema, dashboardOverviewQuerySchema, dashboardTrendQuerySchema, dashboardWorkloadQuerySchema } from "./dashboard.validation.js";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        errors: err.issues.map(e => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }
    return next(err);
  }
};

export const validateDashboardPeriod = validate(dashboardPeriodSchema);
export const validateDashboardSummaryQuery = validate(dashboardSummaryQuerySchema);
export const validateDashboardOverviewQuery = validate(dashboardOverviewQuerySchema);
export const validateDashboardTrendQuery = validate(dashboardTrendQuerySchema);
export const validateDashboardWorkloadQuery = validate(dashboardWorkloadQuerySchema);