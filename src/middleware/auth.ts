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

  const idToken = header.slice('Bearer '.length);

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired sign-in token');
  }

  if (!decoded.email) {
    throw new AppError(401, 'UNAUTHORIZED', 'Google account has no email address');
  }

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

  req.authUser = { id: user.id, firebaseUid: user.firebaseUid, email: user.email };
  next();
});
