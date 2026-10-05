import { Request, Response } from 'express';
import * as pricingService from '../services/pricing.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await pricingService.getPricingSettings();
  return sendSuccess(res, settings, 'Pricing settings fetched');
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await pricingService.updatePricingSettings(req.body);
  return sendSuccess(res, settings, 'Pricing settings updated');
});

export const recommendPrice = asyncHandler(async (req: Request, res: Response) => {
  const breakdown = await pricingService.recommendSellingPrice(req.body.productCost);
  return sendSuccess(res, breakdown, 'Recommended price calculated');
});
