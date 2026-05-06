import { Request, Response, NextFunction } from 'express';
// import { Types } from 'mongoose';
import { createProjectSchema, updateProjectSchema, projectBulkCreateSchema, projectBulkUpdateSchema } from './projects.validation.js';
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

export const validateProjectCreate = validate(createProjectSchema);
export const validateProjectsBulkCreate = validate(projectBulkCreateSchema);
export const validateProjectsBulkUpdate = validate(projectBulkUpdateSchema);
export const validateProjectUpdate = validate(updateProjectSchema);