import { Request, Response } from 'express';
import * as visitService from '../services/visit.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}

export const recordVisit = asyncHandler(async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  await visitService.recordVisit(req.authUser?.id ?? null, ip, userAgent);
  return sendSuccess(res, null, 'Visit recorded', 201);
});
