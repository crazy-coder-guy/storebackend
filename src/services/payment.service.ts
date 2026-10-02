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
  notifyPlacedSafely(verified);
  return verified;
}

function notifyPlacedSafely(order: Awaited<ReturnType<typeof getOrderById>>) {
  // Fire-and-forget — `void` alone doesn't catch a rejection, so a push
  // failure (e.g. no subscription) here must never crash the request that
  // just confirmed a real payment.
  orderNotificationService.notifyOrderPlaced(order).catch((err) => {
    console.error(`[payment] notifyOrderPlaced failed for ${order.orderNumber}:`, err);
  });
}

// Covers the case where Razorpay actually captured the money but the
// browser never got to run the success `handler` — the tab was reloaded or
// closed mid-confirmation, a network blip dropped the callback, etc. The
// client-side flow alone can't recover from that, so this asks Razorpay's
// API directly (authenticated with our secret key, not a client-supplied
// signature) whether a captured payment exists for this order's Razorpay
// order id, and finalizes it the same way a normal verify would.
export async function reconcilePayment(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.paymentStatus === 'PAID') return getOrderById(orderId);
  if (!order.razorpayOrderId) return getOrderById(orderId);

  const { items: payments } = await razorpay.orders.fetchPayments(order.razorpayOrderId);
  const captured = payments.find((p) => p.status === 'captured');
  if (!captured) return getOrderById(orderId);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      razorpayPaymentId: captured.id,
    },
  });

  const reconciled = await getOrderById(orderId);
  notifyPlacedSafely(reconciled);
  return reconciled;
}
