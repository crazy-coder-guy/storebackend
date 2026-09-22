import slugify from 'slugify';

export function generateSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/**
 * Builds a deterministic SKU fragment from a slug, e.g. "kai-oversized-vest" -> "KAI-OV".
 */
export function slugToSkuFragment(slug: string, segments = 2): string {
  const parts = slug.split('-').filter(Boolean);
  const fragment = parts
    .slice(0, segments)
    .map((p) => p.slice(0, 3))
    .join('-');
  return fragment.toUpperCase();
}
