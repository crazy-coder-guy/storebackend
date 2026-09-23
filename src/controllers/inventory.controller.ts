import { Request, Response } from 'express';
import * as inventoryService from '../services/inventory.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const productId = req.query.product_id ? String(req.query.product_id) : undefined;
  const sizeId = req.query.size_id ? String(req.query.size_id) : undefined;
  const colorId = req.query.color_id ? String(req.query.color_id) : undefined;
  const stockStatus = req.query.stock_status
    ? (String(req.query.stock_status) as 'in_stock' | 'low_stock' | 'out_of_stock')
    : undefined;
  const threshold = req.query.threshold ? parseInt(String(req.query.threshold), 10) : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  const result = await inventoryService.listInventory({
    page,
    limit,
    skip,
    take,
    search,
    productId,
    sizeId,
    colorId,
    stockStatus,
    threshold: threshold !== undefined && Number.isFinite(threshold) ? threshold : undefined,
    sortBy,
    sortOrder,
  });
  return sendSuccess(res, result, 'Inventory fetched');
});

export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const threshold = req.query.threshold ? parseInt(String(req.query.threshold), 10) : 10;
  const items = await inventoryService.listLowStock(Number.isFinite(threshold) ? threshold : 10);
  return sendSuccess(res, items, 'Low-stock variants fetched');
});

export const getOutOfStock = asyncHandler(async (_req: Request, res: Response) => {
  const items = await inventoryService.listOutOfStock();
  return sendSuccess(res, items, 'Out-of-stock variants fetched');
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.adjustStock(req.params.variantId, req.body);
  return sendSuccess(res, result, 'Stock adjusted');
});

export const getVariantHistory = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const result = await inventoryService.getVariantHistory(req.params.variantId, {
    page,
    limit,
    skip,
    take,
  });
  return sendSuccess(res, result, 'Inventory history fetched');
});
