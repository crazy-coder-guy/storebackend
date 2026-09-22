import { Request, Response } from 'express';
import * as sizeService from '../services/size.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listSizes = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;
  const result = await sizeService.listSizes({ page, limit, skip, take, status });
  return sendSuccess(res, result, 'Sizes fetched');
});

export const createSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await sizeService.createSize(req.body);
  return sendSuccess(res, size, 'Size created', 201);
});

export const updateSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await sizeService.updateSize(req.params.id, req.body);
  return sendSuccess(res, size, 'Size updated');
});

export const deleteSize = asyncHandler(async (req: Request, res: Response) => {
  const size = await sizeService.softDeleteSize(req.params.id);
  return sendSuccess(res, size, 'Size deactivated');
});
