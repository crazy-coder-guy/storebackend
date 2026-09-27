import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

// Admin-facing: everyone currently sitting on a non-empty cart, so the team
// doesn't have to open every customer profile one by one to find them.
export const listAbandonedCarts = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const result = await cartService.listCartsWithItems({ page, limit, skip, take, search });
  return sendSuccess(res, result, 'Carts fetched');
});
