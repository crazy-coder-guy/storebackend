import { Request, Response } from 'express';
import * as pushService from '../services/push.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await pushService.subscribe(req.body);
  return sendSuccess(res, subscription, 'Subscribed to push notifications', 201);
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  await pushService.unsubscribe(req.body);
  return sendSuccess(res, null, 'Unsubscribed from push notifications');
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const record = await pushService.sendNotification(req.body);
  return sendSuccess(res, record, 'Notification sent', 201);
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = parsePagination(req);
  const result = await pushService.listNotifications(page, limit, skip, take);
  return sendSuccess(res, result, 'Notifications fetched');
});

export const getSubscriberCount = asyncHandler(async (_req: Request, res: Response) => {
  const count = await pushService.getSubscriberCount();
  return sendSuccess(res, { count }, 'Subscriber count fetched');
});
