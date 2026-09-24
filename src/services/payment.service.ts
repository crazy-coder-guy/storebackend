import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { VerifyPaymentInput } from '../validation/payment.validation';
import { getOrderById } from './order.service';
import * as orderNotificationService from './orderNotification.service';

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export async function createRazorpayOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.paymentStatus === 'PAID') {
    throw new AppError(409, 'ALREADY_PAID', 'This order has already been paid for');
  }

  // Razorpay expects the smallest currency unit (paise for INR).
  const amountInPaise = Math.round(Number(order.totalAmount) * 100);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: razorpayOrder.currency,
    keyId: config.razorpay.keyId,
    orderId: order.id,
    orderNumber: order.orderNumber,
  };
}

export async function verifyPayment(orderId: string, input: VerifyPaymentInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) {
    throw new AppError(422, 'ORDER_MISMATCH', 'This payment does not correspond to this order');
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  const isValid =
    expectedSignature.length === input.razorpaySignature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(input.razorpaySignature));

  if (!isValid) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Payment signature verification failed');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    },
  });

  const verified = await getOrderById(orderId);
  void orderNotificationService.notifyOrderPlaced(verified);
  return verified;
}
