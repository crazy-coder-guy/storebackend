import { prisma } from '../database/prisma';
import { buildMeta } from '../utils/pagination';

interface SearchParams {
  q: string;
  page: number;
  limit: number;
  skip: number;
  take: number;
}

interface SearchRow {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  mrp: string;
  badge: string | null;
  categoryName: string;
  imageUrl: string | null;
}

interface CountRow {
  count: bigint;
}

export async function searchProducts(params: SearchParams) {
  const { q, page, limit, skip, take } = params;
  const term = q.trim();

  if (!term) {
    return { items: [], meta: buildMeta(page, limit, 0) };
  }

  const like = `%${term}%`;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<SearchRow[]>`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.base_price AS "basePrice",
        p.mrp,
        p.badge,
        c.name AS "categoryName",
        (
          SELECT pi.image_url FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) AS "imageUrl"
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'ACTIVE'
        AND (
          p.name % ${term}
          OR p.description % ${term}
          OR c.name % ${term}
          OR p.name ILIKE ${like}
          OR p.product_type ILIKE ${like}
        )
      ORDER BY
        GREATEST(
          similarity(p.name, ${term}),
          similarity(coalesce(p.description, ''), ${term}) * 0.5,
          similarity(c.name, ${term}) * 0.7,
          CASE WHEN p.name ILIKE ${like} THEN 1 ELSE 0 END
        ) DESC,
        p.created_at DESC
      LIMIT ${take} OFFSET ${skip}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'ACTIVE'
        AND (
          p.name % ${term}
          OR p.description % ${term}
          OR c.name % ${term}
          OR p.name ILIKE ${like}
          OR p.product_type ILIKE ${like}
        )
    `,
  ]);

  const total = Number(countRows[0]?.count ?? 0);

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    basePrice: Number(r.basePrice),
    mrp: Number(r.mrp),
    badge: r.badge,
    categoryName: r.categoryName,
    image: r.imageUrl,
  }));

  // Log meaningful searches (skip 1-character noise, and only page 1 so
  // paginating the same query doesn't double-count) so the admin can see
  // what customers actually search for.
  if (term.length >= 2 && page === 1) {
    logSearch(term, total).catch((err) => console.error('Failed to log search query:', err));
  }

  return { items, meta: buildMeta(page, limit, total) };
}

const SESSION_WINDOW_MS = 5000;

/**
 * The frontend queries this endpoint on every keystroke (debounced) to drive
 * live suggestions, so a single search intent like "clothes" arrives here as
 * a burst of growing/shrinking fragments ("c", "cl", "clo", ...). Logging
 * each one separately would flood the admin's analytics with typing noise.
 * Instead, collapse a fragment into the previous log row when it's a
 * continuation (or correction) of it within a short window, so only the
 * final settled term the customer stopped on ends up recorded.
 */
async function logSearch(term: string, resultsCount: number) {
  const normalizedQuery = term.toLowerCase();
  const since = new Date(Date.now() - SESSION_WINDOW_MS);

  const recent = await prisma.searchLog.findFirst({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  const isContinuation =
    recent &&
    (normalizedQuery.startsWith(recent.normalizedQuery) || recent.normalizedQuery.startsWith(normalizedQuery));

  if (isContinuation && recent) {
    await prisma.searchLog.update({
      where: { id: recent.id },
      data: { query: term, normalizedQuery, resultsCount, createdAt: new Date() },
    });
  } else {
    await prisma.searchLog.create({ data: { query: term, normalizedQuery, resultsCount } });
  }
}

interface TopSearchesParams {
  days: number;
  limit: number;
}

export async function getTopSearches(params: TopSearchesParams) {
  const { days, limit } = params;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.searchLog.groupBy({
    by: ['normalizedQuery'],
    where: { createdAt: { gte: since } },
    _count: { normalizedQuery: true },
    _avg: { resultsCount: true },
    _max: { createdAt: true },
    orderBy: { _count: { normalizedQuery: 'desc' } },
    take: limit,
  });

  return grouped.map((g) => ({
    term: g.normalizedQuery,
    searchCount: g._count.normalizedQuery,
    avgResults: g._avg.resultsCount ?? 0,
    lastSearchedAt: g._max.createdAt,
  }));
}
