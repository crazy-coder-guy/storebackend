import { Request, Response } from 'express';
import * as exchangeService from '../services/exchange.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listEligibleItems = asyncHandler(async (req: Request, res: Response) => {
  const items = await exchangeService.listEligibleItems(req.authUser!.id);
  return sendSuccess(res, items, 'Exchange-eligible items fetched');
});

export const listMyExchangeRequests = asyncHandler(async (req: Request, res: Response) => {
  const items = await exchangeService.listMyExchangeRequests(req.authUser!.id);
  return sendSuccess(res, items, 'Your exchange requests fetched');
});

export const createExchangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as { images?: Express.Multer.File[] } | undefined;
  const request = await exchangeService.createExchangeRequest(req.authUser!.id, req.body, files ?? {});
  return sendSuccess(res, request, 'Exchange request submitted', 201);
});

export const cancelOwnExchangeRequest = asyncHandler(async (req: Request, res: Response) => {
  await exchangeService.cancelOwnExchangeRequest(req.authUser!.id, req.params.id);
  return sendSuccess(res, null, 'Exchange request cancelled');
});

export const listAllExchangeRequests = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req);
  const status = req.query.status
    ? (String(req.query.status) as 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED')
    : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const result = await exchangeService.listAllExchangeRequests({ ...pagination, status, search });
  return sendSuccess(res, result, 'Exchange requests fetched');
});

export const updateExchangeStatus = asyncHandler(async (req: Request, res: Response) => {
  const request = await exchangeService.updateExchangeStatus(req.params.id, req.body.status, req.body.adminNote);
  return sendSuccess(res, request, 'Exchange request updated');
});
