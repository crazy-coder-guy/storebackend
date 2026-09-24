import { OrderStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import * as pushService from './push.service';

/**
 * Order-triggered push notifications, built on top of the generic
 * pushService.sendNotification — the same primitive the admin "send
 * notification" / templates feature already uses. Any future automated
 * trigger (back-in-stock, price drop, abandoned cart, etc.) should follow
 * this same shape: resolve the target user, look up (or add to) the message
 * map below, and call notifyUser. None of this touches push.service.ts,
 * so new triggers never risk the delivery/cleanup logic that already works.
 */

interface NotifiableOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: OrderStatus;
}

// Orders link to a Customer (matched by email at checkout), not directly to
// the Firebase-authenticated User — same resolution order.service.ts's
// listMyOrders already relies on. If this email was never used to sign in,
// there's no push subscription to reach, so callers just no-op.
async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

async function notifyUser(email: string, notification: { title: string; body: string; url: string }) {
  const userId = await resolveUserId(email);
  if (!userId) return;

  try {
    await pushService.sendNotification({ userId, ...notification });
  } catch (err) {
    // A failed push must never break the order flow that triggered it.
    console.error(`[orderNotification] failed to notify user ${userId}:`, err);
  }
}

type StatusMessageBuilder = (order: NotifiableOrder) => { title: string; body: string };

// Deliberately no PENDING entry — that's the moment createOrder already
// sends its own "Order placed" message, so this map only covers the
// transitions that happen afterward via updateOrderStatus.
const ORDER_STATUS_MESSAGES: Partial<Record<OrderStatus, StatusMessageBuilder>> = {
  PROCESSING: (order) => ({
    title: 'Order confirmed',
    body: `Your order ${order.orderNumber} is being processed.`,
  }),
  SHIPPED: (order) => ({
    title: 'Order shipped',
    body: `Your order ${order.orderNumber} is on its way.`,
  }),
  DELIVERED: (order) => ({
    title: 'Order delivered',
    body: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
  }),
  CANCELLED: (order) => ({
    title: 'Order cancelled',
    body: `Your order ${order.orderNumber} has been cancelled.`,
  }),
};

export async function notifyOrderPlaced(order: NotifiableOrder) {
  await notifyUser(order.customerEmail, {
    title: 'Order placed',
    body: `We've received your order ${order.orderNumber}.`,
    url: `/orders/${order.id}`,
  });
}

export async function notifyOrderStatusChanged(order: NotifiableOrder) {
  const buildMessage = ORDER_STATUS_MESSAGES[order.status];
  if (!buildMessage) return;

  const { title, body } = buildMessage(order);
  await notifyUser(order.customerEmail, { title, body, url: `/orders/${order.id}` });
}
