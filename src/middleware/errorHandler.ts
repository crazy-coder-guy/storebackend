import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';

function codeForUniqueViolation(target: string[] | undefined): string {
  const field = target?.[0] ?? '';
  if (field.includes('slug')) return 'DUPLICATE_SLUG';
  if (field.includes('sku')) return 'DUPLICATE_SKU';
  if (field.includes('product_id') && field.includes('color_id') && field.includes('size_id')) {
    return 'DUPLICATE_VARIANT';
  }
  if (field.includes('name')) return 'DUPLICATE_NAME';
  if (field.includes('code')) return 'DUPLICATE_CODE';
  if (field.includes('email')) return 'DUPLICATE_EMAIL';
  if (field.includes('order_number')) return 'DUPLICATE_ORDER_NUMBER';
  return 'DUPLICATE_ENTRY';
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code },
    });
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message;
    return res.status(422).json({
      success: false,
      message,
      error: { code: 'INVALID_FILE' },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = err.meta?.target as string[] | string | undefined;
      const targetArr = Array.isArray(target) ? target : target ? [target] : undefined;
      const code = codeForUniqueViolation(targetArr);
      return res.status(409).json({
        success: false,
        message: `A record with this ${targetArr?.join(', ') || 'value'} already exists`,
        error: { code },
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        error: { code: 'NOT_FOUND' },
      });
    }
  }

  console.error(`[500] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: { code: 'INTERNAL_ERROR' },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    error: { code: 'NOT_FOUND' },
  });
}
