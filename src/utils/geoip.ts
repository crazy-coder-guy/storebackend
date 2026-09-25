export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
}

const EMPTY_GEO: GeoInfo = { country: null, region: null, city: null };

// Loopback/LAN ranges — never worth an external lookup (local dev, or a
// visit proxied through infra that strips the real client IP).
const PRIVATE_IP_PATTERN = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

// A free geolocation lookup is best-effort by nature — an outage or rate
// limit on ip-api.com's side should never break visit recording itself.
export async function lookupGeo(ip: string): Promise<GeoInfo> {
  if (!ip || PRIVATE_IP_PATTERN.test(ip)) return EMPTY_GEO;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`
    );
    if (!res.ok) return EMPTY_GEO;

    const data = (await res.json()) as {
      status: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status !== 'success') return EMPTY_GEO;

    return { country: data.country ?? null, region: data.regionName ?? null, city: data.city ?? null };
  } catch {
    return EMPTY_GEO;
  }
}
