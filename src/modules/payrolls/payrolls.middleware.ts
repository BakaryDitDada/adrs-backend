import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { createPayrollBatchSchema, updatePayrollSchema, batchUpdateSchema, batchCancelSchema, getPayrollsQuerySchema } from "./payrolls.validation.js";

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

export const validatePayrollCreate = validate(createPayrollBatchSchema);
export const validatePayrollUpdate = validate(updatePayrollSchema);
export const validatePayrollBulkUpdate = validate(batchUpdateSchema);
export const validatePayrollBulkCancel = validate(batchCancelSchema);
export const validateGetPayrollsQuery = validate(getPayrollsQuerySchema);