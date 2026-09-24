import { OrderStatus } from '@prisma/client';
import { prisma } from '../database/prisma';
import * as pushService from './push.service';

interface NotifiableOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: OrderStatus;
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

async function notifyUser(email: string, notification: { title: string; body: string; url: string }) {
  const userId = await resolveUserId(email);
  if (!userId) return;
  await pushService.sendNotification({ userId, ...notification });
}

type StatusMessageBuilder = (order: NotifiableOrder) => { title: string; body: string };

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
