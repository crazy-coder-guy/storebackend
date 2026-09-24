import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const items = await cartService.getCart(req.authUser!.id);
  return sendSuccess(res, items, 'Cart fetched');
});

export const addCartItem = asyncHandler(async (req: Request, res: Response) => {
  const items = await cartService.addCartItem(req.authUser!.id, req.body);
  return sendSuccess(res, items, 'Item added to cart', 201);
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const items = await cartService.updateCartItem(req.authUser!.id, req.params.itemId, req.body);
  return sendSuccess(res, items, 'Cart item updated');
});

export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const items = await cartService.removeCartItem(req.authUser!.id, req.params.itemId);
  return sendSuccess(res, items, 'Item removed from cart');
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const items = await cartService.clearCart(req.authUser!.id);
  return sendSuccess(res, items, 'Cart cleared');
});
