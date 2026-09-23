import { Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { sendSuccess } from '../utils/response';

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { skip, take, page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const status = req.query.status ? (String(req.query.status) as 'ACTIVE' | 'INACTIVE') : undefined;

  const result = await customerService.listCustomers({ page, limit, skip, take, search, status });
  return sendSuccess(res, result, 'Customers fetched');
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return sendSuccess(res, customer, 'Customer fetched');
});
