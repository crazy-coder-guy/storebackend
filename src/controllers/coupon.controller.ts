import { Request, Response } from 'express';
import * as couponService from '../services/coupon.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { emitRealtime } from '../realtime/socket';
import { sendSuccess } from '../utils/response';

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;
  const result = await couponService.listCoupons({ page, limit, skip, take, search, status });
  return sendSuccess(res, result, 'Coupons fetched');
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.getCouponById(req.params.id);
  return sendSuccess(res, coupon, 'Coupon fetched');
});

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.createCoupon(req.body);
  emitRealtime('coupon', 'created', coupon.id);
  return sendSuccess(res, coupon, 'Coupon created', 201);
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  emitRealtime('coupon', 'updated', coupon.id);
  return sendSuccess(res, coupon, 'Coupon updated');
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await couponService.deleteCoupon(req.params.id);
  emitRealtime('coupon', 'deleted', result.id);
  return sendSuccess(res, result, 'Coupon deleted');
});
