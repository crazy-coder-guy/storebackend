import { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../lib/firebaseAdmin';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// In-memory cache for decoded auth tokens & user records to avoid
// round-trip latency to Firebase Admin and DB upsert on every single request.
interface CachedUser {
  user: AuthUser;
  expiresAt: number;
}
const authCache = new Map<string, CachedUser>();
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveAuthUser(idToken: string): Promise<AuthUser | null> {
  const now = Date.now();
  const cached = authCache.get(idToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    return null;
  }

  if (!decoded.email) return null;

  const user = await prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    update: {
      email: decoded.email,
      name: decoded.name ?? null,
      photoUrl: decoded.picture ?? null,
    },
    create: {
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: decoded.name ?? null,
      photoUrl: decoded.picture ?? null,
    },
  });

  const authUser: AuthUser = { id: user.id, firebaseUid: user.firebaseUid, email: user.email };
  authCache.set(idToken, { user: authUser, expiresAt: now + AUTH_CACHE_TTL_MS });

  // Periodically sweep expired entries if cache grows
  if (authCache.size > 500) {
    for (const [key, value] of authCache.entries()) {
      if (value.expiresAt <= now) authCache.delete(key);
    }
  }

  return authUser;
}

/**
 * Verifies the Firebase (Google Sign-In) ID token in the Authorization
 * header, and upserts a local User row for it — so the very first
 * authenticated request from a new Google account transparently creates
 * their storefront account.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }

  const authUser = await resolveAuthUser(header.slice('Bearer '.length));
  if (!authUser) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired sign-in token');
  }

  req.authUser = authUser;
  next();
});

/**
 * Like requireAuth, but never rejects the request — used by endpoints that
 * work for signed-out visitors too, but want to know who the caller is when
 * they happen to be signed in (e.g. tying a push subscription to a user).
 */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const authUser = await resolveAuthUser(header.slice('Bearer '.length));
    if (authUser) req.authUser = authUser;
  }
  next();
});
