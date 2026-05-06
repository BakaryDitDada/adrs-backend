import { Request, Response, NextFunction } from 'express';
// import { Types } from 'mongoose';
import { createTaskSchema, updateTaskSchema, taskBulkCreateSchema, taskBulkUpdateSchema } from './tasks.validation.js';
import AppError from '../../utils/appError.js';
import { ZodError, ZodSchema } from 'zod';

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
    return next(new AppError('Invalid request data', 400));
  }
};

export const validateTaskCreate = validate(createTaskSchema);
export const validateTaskUpdate = validate(updateTaskSchema);
export const validateTasksBulkCreate = validate(taskBulkCreateSchema);
export const validateTasksBulkUpdate = validate(taskBulkUpdateSchema);