import { Request, Response } from 'express';
import * as newsletterService from '../services/newsletter.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { alreadySubscribed, subscriber } = await newsletterService.subscribe(req.body.email);
  return sendSuccess(
    res,
    { ...subscriber, alreadySubscribed },
    alreadySubscribed ? 'You are already on the list' : 'Subscribed to the newsletter',
    alreadySubscribed ? 200 : 201
  );
});

export const listSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const result = await newsletterService.listSubscribers(pagination);
  return sendSuccess(res, result, 'Subscribers fetched');
});

export const deleteSubscriber = asyncHandler(async (req: Request, res: Response) => {
  await newsletterService.deleteSubscriber(req.params.id);
  return sendSuccess(res, null, 'Subscriber removed');
});

export const syncSubscribers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await newsletterService.syncAllSubscribersToBrevo();
  return sendSuccess(res, result, 'Subscribers synced to Brevo');
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await newsletterService.createCampaign(req.body);
  return sendSuccess(res, campaign, req.body.sendNow ? 'Newsletter sent' : 'Newsletter scheduled', 201);
});

export const listCampaigns = asyncHandler(async (_req: Request, res: Response) => {
  const result = await newsletterService.listCampaigns();
  return sendSuccess(res, result, 'Campaigns fetched');
});
