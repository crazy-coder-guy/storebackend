import { AppError } from '../utils/AppError';

interface IndiaPostOffice {
  District: string;
  State: string;
}

interface IndiaPostResponse {
  Status: string;
  PostOffice: IndiaPostOffice[] | null;
}

// India Post's public API — no key required. Called server-side (not
// directly from the browser) so a CORS or outage issue on their end can be
// handled as a normal 502 rather than leaking directly into the browser console.
export async function lookupPincode(pincode: string) {
  if (!/^\d{6}$/.test(pincode)) {
    throw new AppError(422, 'INVALID_PINCODE', 'Pincode must be exactly 6 digits');
  }

  let data: IndiaPostResponse[];
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) throw new Error(`Upstream returned ${res.status}`);
    data = (await res.json()) as IndiaPostResponse[];
  } catch {
    throw new AppError(502, 'PINCODE_LOOKUP_FAILED', 'Could not look up this pincode right now');
  }

  const postOffice = data[0]?.PostOffice?.[0];
  if (!postOffice) {
    throw new AppError(404, 'PINCODE_NOT_FOUND', "That pincode doesn't exist");
  }

  return { city: postOffice.District, state: postOffice.State };
}
