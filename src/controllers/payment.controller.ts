import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.createRazorpayOrder(req.params.id);
  return sendSuccess(res, result, 'Razorpay order created');
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await paymentService.verifyPayment(req.params.id, req.body);
  return sendSuccess(res, order, 'Payment verified');
});
