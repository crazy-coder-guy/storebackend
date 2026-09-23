import { Request, Response } from 'express';
import * as searchService from '../services/search.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const q = req.query.q ? String(req.query.q) : '';

  const result = await searchService.searchProducts({ q, page, limit, skip, take });
  return sendSuccess(res, result, 'Search results fetched');
});

export const getTopSearches = asyncHandler(async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

  const result = await searchService.getTopSearches({
    days: Number.isFinite(days) && days > 0 ? days : 30,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50,
  });
  return sendSuccess(res, result, 'Top searches fetched');
});
