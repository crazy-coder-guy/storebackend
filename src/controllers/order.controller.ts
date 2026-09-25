import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const status = req.query.status
    ? (String(req.query.status) as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED')
    : undefined;
  const paymentStatus = req.query.payment_status
    ? (String(req.query.payment_status) as 'PAID' | 'UNPAID' | 'REFUNDED')
    : undefined;

  const result = await orderService.listOrders({ page, limit, skip, take, search, status, paymentStatus });
  return sendSuccess(res, result, 'Orders fetched');
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  return sendSuccess(res, order, 'Order fetched');
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.listMyOrders(req.authUser!.id);
  return sendSuccess(res, orders, 'Your orders fetched');
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.authUser!.id, req.authUser!.email, req.body);
  return sendSuccess(res, order, 'Order created', 201);
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  return sendSuccess(res, order, 'Order status updated');
});
