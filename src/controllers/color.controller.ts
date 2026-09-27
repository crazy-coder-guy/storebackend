import { Request, Response } from 'express';
import * as colorService from '../services/color.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { emitRealtime } from '../realtime/socket';
import { sendSuccess } from '../utils/response';

export const listColors = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;
  const result = await colorService.listColors({ page, limit, skip, take, status });
  return sendSuccess(res, result, 'Colors fetched');
});

export const createColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.createColor(req.body);
  emitRealtime('color', 'created', color.id);
  return sendSuccess(res, color, 'Color created', 201);
});

export const updateColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.updateColor(req.params.id, req.body);
  emitRealtime('color', 'updated', color.id);
  return sendSuccess(res, color, 'Color updated');
});

export const deleteColor = asyncHandler(async (req: Request, res: Response) => {
  const color = await colorService.softDeleteColor(req.params.id);
  emitRealtime('color', 'updated', color.id);
  return sendSuccess(res, color, 'Color deactivated');
});
