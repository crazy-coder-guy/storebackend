import { Request, Response } from 'express';
import * as variantService from '../services/productVariant.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const listProductVariants = asyncHandler(async (req: Request, res: Response) => {
  const variants = await variantService.listProductVariants(req.params.productId);
  return sendSuccess(res, variants, 'Product variants fetched');
});

export const getProductVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await variantService.getVariantById(req.params.productId, req.params.variantId);
  return sendSuccess(res, variant, 'Product variant fetched');
});

export const createProductVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await variantService.createProductVariant(req.params.productId, req.body);
  return sendSuccess(res, variant, 'Product variant created', 201);
});

export const updateProductVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await variantService.updateProductVariant(
    req.params.productId,
    req.params.variantId,
    req.body
  );
  return sendSuccess(res, variant, 'Product variant updated');
});

export const deleteProductVariant = asyncHandler(async (req: Request, res: Response) => {
  const variant = await variantService.softDeleteProductVariant(
    req.params.productId,
    req.params.variantId
  );
  return sendSuccess(res, variant, 'Product variant deactivated');
});
