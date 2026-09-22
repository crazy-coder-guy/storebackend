import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

type ValidateTarget = 'body' | 'query' | 'params';

function formatZodError(err: ZodError): string {
  return err.errors
    .map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`)
    .join('; ');
}

export const validate = (schema: AnyZodObject, target: ValidateTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(new AppError(422, 'VALIDATION_ERROR', formatZodError(result.error)));
    }
    req[target] = result.data;
    return next();
  };
};
