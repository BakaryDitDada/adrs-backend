import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { createLeaveSchema, updateLeaveSchema, leaveBulkCreateSchema, leaveBulkUpdateSchema } from "./leaves.validation.js";

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

export const validateCreateLeave = validate(createLeaveSchema);
export const validateUpdateLeave = validate(updateLeaveSchema);
export const validateBulkCreateLeave = validate(leaveBulkCreateSchema);
export const validateBulkUpdateLeave = validate(leaveBulkUpdateSchema);