import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { webPush } from '../lib/webPush';
import { buildMeta } from '../utils/pagination';
import {
  CreateTemplateInput,
  SendNotificationInput,
  SubscribeInput,
  UnsubscribeInput,
} from '../validation/push.validation';

export async function subscribe(input: SubscribeInput, authedUserId: string | null) {
  // A signed-in caller's real user id always wins — the client can't be
  // trusted to self-report which user it is.
  const userId = authedUserId ?? input.userId ?? null;
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userId,
    },
    create: {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userId,
    },
  });
}

export async function unsubscribe(input: UnsubscribeInput) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint } });
}

// Users who have at least one active push subscription — the only people an
// admin can meaningfully target, since anyone else has nothing to send to.
export async function listSubscribers() {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { not: null } },
    include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const seen = new Map<string, (typeof subscriptions)[number]['user']>();
  for (const sub of subscriptions) {
    if (sub.user && !seen.has(sub.user.id)) seen.set(sub.user.id, sub.user);
  }
  return Array.from(seen.values());
}

export async function sendNotification(input: SendNotificationInput) {
  if (input.userId) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new AppError(422, 'INVALID_USER', 'userId does not reference an existing user');
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: input.userId ? { userId: input.userId } : undefined,
  });

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? '/',
  });

  let successCount = 0;
  let failureCount = 0;
  const deadEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        successCount += 1;
      } catch (err) {
        failureCount += 1;
        // 404/410 means the browser unsubscribed or the endpoint expired —
        // clean up rather than retrying it on every future send.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: deadEndpoints } } });
  }

  const record = await prisma.pushNotification.create({
    data: {
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      targetUserId: input.userId ?? null,
      successCount,
      failureCount,
    },
  });

  return record;
}

export async function listNotifications(page: number, limit: number, skip: number, take: number) {
  const [items, total] = await Promise.all([
    prisma.pushNotification.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.pushNotification.count(),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function getSubscriberCount() {
  return prisma.pushSubscription.count();
}

export async function listTemplates() {
  return prisma.notificationTemplate.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createTemplate(input: CreateTemplateInput) {
  return prisma.notificationTemplate.create({
    data: {
      name: input.name,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
    },
  });
}

export async function deleteTemplate(id: string) {
  const template = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!template) throw new AppError(404, 'NOT_FOUND', 'Template not found');
  await prisma.notificationTemplate.delete({ where: { id } });
}
