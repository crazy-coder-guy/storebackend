import { Request, Response } from 'express';
import * as colorService from '../services/color.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listColors = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;
  const result = await colorService.listColors({ page, limit, skip, take, status });
  return sendSuccess(res, result, 'Colors fetched');
});

export const createColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.createColor(req.body);
  return sendSuccess(res, color, 'Color created', 201);
});

export const updateColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.updateColor(req.params.id, req.body);
  return sendSuccess(res, color, 'Color updated');
});

export const deleteColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.softDeleteColor(req.params.id);
  return sendSuccess(res, color, 'Color deactivated');
});
