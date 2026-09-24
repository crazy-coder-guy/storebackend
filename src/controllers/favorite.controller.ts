import { Request, Response } from 'express';
import * as favoriteService from '../services/favorite.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const listFavorites = asyncHandler(async (req: Request, res: Response) => {
  const productIds = await favoriteService.listFavorites(req.authUser!.id);
  return sendSuccess(res, productIds, 'Favorites fetched');
});

export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const productIds = await favoriteService.addFavorite(req.authUser!.id, req.params.productId);
  return sendSuccess(res, productIds, 'Added to favorites', 201);
});

export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const productIds = await favoriteService.removeFavorite(req.authUser!.id, req.params.productId);
  return sendSuccess(res, productIds, 'Removed from favorites');
});

export const clearFavorites = asyncHandler(async (req: Request, res: Response) => {
  const productIds = await favoriteService.clearFavorites(req.authUser!.id);
  return sendSuccess(res, productIds, 'Favorites cleared');
});
