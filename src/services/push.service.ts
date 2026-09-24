import { prisma } from '../database/prisma';
import { webPush } from '../lib/webPush';
import { buildMeta } from '../utils/pagination';
import { SendNotificationInput, SubscribeInput, UnsubscribeInput } from '../validation/push.validation';

export async function subscribe(input: SubscribeInput) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userId: input.userId ?? null,
    },
    create: {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userId: input.userId ?? null,
    },
  });
}

export async function unsubscribe(input: UnsubscribeInput) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint } });
}

export async function sendNotification(input: SendNotificationInput) {
  const subscriptions = await prisma.pushSubscription.findMany();

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
