import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { employeeCreateSchema, employeeUpdateSchema, employeeBulkCreateSchema } from "./employees.validation.js";

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

export const validateEmployeeCreate = validate(employeeCreateSchema);
export const validateEmployeeUpdate = validate(employeeUpdateSchema);
export const validateEmployeeBulkCreate = validate(employeeBulkCreateSchema);