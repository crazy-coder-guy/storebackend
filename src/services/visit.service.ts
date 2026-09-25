import { prisma } from '../database/prisma';
import { lookupGeo } from '../utils/geoip';
import { parseUserAgent } from '../utils/userAgent';

export async function recordVisit(userId: string | null, ip: string, userAgent: string) {
  const { deviceType, os, browser } = parseUserAgent(userAgent);
  const geo = await lookupGeo(ip);

  return prisma.visit.create({
    data: {
      userId,
      ipAddress: ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      deviceType,
      os,
      browser,
      userAgent,
    },
  });
}

export interface VisitInfo {
  city: string | null;
  region: string | null;
  country: string | null;
  deviceType: string;
  os: string | null;
  browser: string | null;
  lastSeenAt: Date;
}

/**
 * Batches the "where is this customer browsing from" lookup for a page of
 * Customer rows: one query to resolve Customer.email -> User.id, one query
 * (via Postgres DISTINCT ON through Prisma's `distinct`) to grab each user's
 * single latest Visit — instead of two queries per row.
 */
export async function getLatestVisitsByEmail(emails: string[]): Promise<Map<string, VisitInfo>> {
  const result = new Map<string, VisitInfo>();
  if (emails.length === 0) return result;

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  if (users.length === 0) return result;

  const userIds = users.map((u) => u.id);
  const visits = await prisma.visit.findMany({
    where: { userId: { in: userIds } },
    distinct: ['userId'],
    orderBy: { createdAt: 'desc' },
  });
  const visitByUserId = new Map(visits.map((v) => [v.userId as string, v]));

  for (const user of users) {
    const visit = visitByUserId.get(user.id);
    if (!visit) continue;
    result.set(user.email, {
      city: visit.city,
      region: visit.region,
      country: visit.country,
      deviceType: visit.deviceType,
      os: visit.os,
      browser: visit.browser,
      lastSeenAt: visit.createdAt,
    });
  }

  return result;
}
