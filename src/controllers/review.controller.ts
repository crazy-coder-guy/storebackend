import { Request, Response } from 'express';
import * as reviewService from '../services/review.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const listProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const rating = req.query.rating ? Number(req.query.rating) : undefined;
  const result = await reviewService.listProductReviews(req.params.productId, { ...pagination, rating });
  return sendSuccess(res, result, 'Reviews fetched');
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as { images?: Express.Multer.File[]; video?: Express.Multer.File[] } | undefined;
  const review = await reviewService.createReview(
    req.authUser!.id,
    req.params.productId,
    req.body,
    files ?? {}
  );
  return sendSuccess(res, review, 'Review submitted', 201);
});

export const deleteOwnReview = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteOwnReview(req.authUser!.id, req.params.productId, req.params.reviewId);
  return sendSuccess(res, null, 'Review deleted');
});

export const listReviewableOrders = asyncHandler(async (req: Request, res: Response) => {
  const items = await reviewService.listReviewableOrders(req.authUser!.id);
  return sendSuccess(res, items, 'Reviewable products fetched');
});

export const listAllReviews = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const result = await reviewService.listAllReviews(pagination);
  return sendSuccess(res, result, 'Reviews fetched');
});

export const adminDeleteReview = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.adminDeleteReview(req.params.id);
  return sendSuccess(res, null, 'Review deleted');
});
