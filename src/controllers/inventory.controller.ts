import { Request, Response } from 'express';
import * as inventoryService from '../services/inventory.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const sku = req.query.sku ? String(req.query.sku) : undefined;
  const productId = req.query.product_id ? String(req.query.product_id) : undefined;
  const productName = req.query.product_name ? String(req.query.product_name) : undefined;
  const sizeId = req.query.size_id ? String(req.query.size_id) : undefined;
  const colorId = req.query.color_id ? String(req.query.color_id) : undefined;

  const result = await inventoryService.listInventory({
    page,
    limit,
    skip,
    take,
    sku,
    productId,
    productName,
    sizeId,
    colorId,
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
