import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import * as brevo from '../lib/brevo';

export async function subscribe(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { alreadySubscribed: true, subscriber: existing };

  const subscriber = await prisma.newsletterSubscriber.create({ data: { email: normalizedEmail } });
  void brevo.syncContactToBrevo(normalizedEmail);
  return { alreadySubscribed: false, subscriber };
}

export async function listSubscribers(params: { page: number; limit: number; skip: number; take: number }) {
  const [items, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.newsletterSubscriber.count(),
  ]);

  return { items, meta: buildMeta(params.page, params.limit, total) };
}

export async function deleteSubscriber(id: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!subscriber) throw new AppError(404, 'NOT_FOUND', 'Subscriber not found');
  await prisma.newsletterSubscriber.delete({ where: { id } });
  void brevo.removeContactFromBrevo(subscriber.email);
}

// Fire-and-forget sync on subscribe (see `subscribe` above) can silently miss
// a contact if Brevo has a transient hiccup — this re-pushes every locally
// stored subscriber so a campaign never goes out to a stale/incomplete list.
export async function syncAllSubscribersToBrevo() {
  const subscribers = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
  for (const { email } of subscribers) {
    await brevo.syncContactToBrevo(email);
  }
  return { synced: subscribers.length };
}

export async function createCampaign(input: { subject: string; htmlContent: string; sendNow: boolean; scheduledAt?: string }) {
  await syncAllSubscribersToBrevo();
  return brevo.createCampaign(input);
}

export async function listCampaigns() {
  return brevo.listCampaigns();
}
