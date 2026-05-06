import { NextFunction, Request, Response } from 'express';
import { chatSchema, generateReportSchema } from './ai.validation.js';
import { ZodError, ZodSchema } from 'zod';
import AppError from '../../utils/appError.js';

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

export const validateChat = validate(chatSchema);
export const validateGenerateReport = validate(generateReportSchema);
