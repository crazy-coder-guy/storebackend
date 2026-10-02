import crypto from 'crypto';
import Razorpay from 'razorpay';
import { OrderStatus } from '@prisma/client';
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

  return markOrderPaid(order, input.razorpayPaymentId, input.razorpaySignature);
}

async function markOrderPaid(
  order: { id: string; status: OrderStatus },
  razorpayPaymentId: string,
  razorpaySignature?: string
) {
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      razorpayPaymentId,
      ...(razorpaySignature ? { razorpaySignature } : {}),
    },
  });

  const confirmed = await getOrderById(order.id);
  notifyPlacedSafely(confirmed);
  return confirmed;
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

  return markOrderPaid(order, captured.id);
}

// Razorpay's server-to-server notification of a successful payment — the
// authoritative way to learn a payment captured, independent of whether the
// customer's browser ever runs JS again (closed tab, no network, reload
// mid-confirmation). Must verify the signature over the exact raw body
// Razorpay sent, since re-serializing the parsed JSON isn't guaranteed to
// produce identical bytes.
export async function handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!config.razorpay.webhookSecret) {
    throw new AppError(500, 'WEBHOOK_NOT_CONFIGURED', 'RAZORPAY_WEBHOOK_SECRET is not configured');
  }
  if (!signature) {
    throw new AppError(400, 'MISSING_SIGNATURE', 'Missing X-Razorpay-Signature header');
  }

  const expectedSignature = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(rawBody).digest('hex');
  const isValid =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  if (!isValid) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed');
  }

  const payload = JSON.parse(rawBody.toString('utf8'));
  if (payload.event !== 'payment.captured') {
    // Other events (payment.failed, order.paid, refund.*, …) aren't acted on
    // — ack so Razorpay doesn't keep retrying an event we deliberately ignore.
    return { ignored: true, event: payload.event };
  }

  const payment = payload.payload?.payment?.entity;
  const razorpayOrderId: string | undefined = payment?.order_id;
  const razorpayPaymentId: string | undefined = payment?.id;
  if (!razorpayOrderId || !razorpayPaymentId) {
    return { ignored: true, reason: 'malformed payload' };
  }

  const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
  if (!order) {
    // Could be a payment for an order this backend doesn't know about (a
    // different environment's test webhook, for instance) — ack rather than
    // 500, since retrying won't make the order appear.
    console.warn(`[webhook] No order found for razorpayOrderId ${razorpayOrderId}`);
    return { ignored: true, reason: 'order not found' };
  }
  if (order.paymentStatus === 'PAID') {
    // Razorpay retries webhooks; already handled (e.g. the client-side
    // verify or a reconcile call got there first) — idempotent no-op.
    return { alreadyProcessed: true, orderId: order.id };
  }

  const confirmed = await markOrderPaid(order, razorpayPaymentId);
  return { orderId: confirmed.id, orderNumber: confirmed.orderNumber };
}
