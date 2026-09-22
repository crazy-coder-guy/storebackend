import { Request, Response } from 'express';
import * as productImageService from '../services/productImage.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const listProductImages = asyncHandler(async (req: Request, res: Response) => {
  const images = await productImageService.listProductImages(req.params.productId);
  return sendSuccess(res, images, 'Product images fetched');
});

export const createProductImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await productImageService.createProductImage(req.params.productId, req.body);
  return sendSuccess(res, image, 'Product image created', 201);
});

export const updateProductImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await productImageService.updateProductImage(
    req.params.productId,
    req.params.imageId,
    req.body
  );
  return sendSuccess(res, image, 'Product image updated');
});

export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  await productImageService.deleteProductImage(req.params.productId, req.params.imageId);
  return sendSuccess(res, null, 'Product image deleted');
});
