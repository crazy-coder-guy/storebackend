import { Request, Response } from 'express';
import * as storefrontService from '../services/storefront.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await storefrontService.getStorefrontSettings();
  return sendSuccess(res, settings, 'Storefront settings fetched');
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await storefrontService.updateStorefrontSettings(req.body);
  return sendSuccess(res, settings, 'Storefront settings updated');
});

export const getFeaturedProducts = asyncHandler(async (_req: Request, res: Response) => {
  const items = await storefrontService.listFeaturedProducts();
  return sendSuccess(res, items, 'Featured products fetched');
});

export const setFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const items = await storefrontService.setFeaturedProducts(req.body);
  return sendSuccess(res, items, 'Featured products updated');
});
