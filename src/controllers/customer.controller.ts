import { Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import * as customerService from '../services/customer.service';
import { prisma } from '../database/prisma';
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

export const getCustomerCart = asyncHandler(async (req: Request, res: Response) => {
  const [cart, latestItem] = await Promise.all([
    cartService.getCart(req.params.id),
    // Cart.updatedAt is bumped by the upsert on every read (getCart itself
    // touches it), so it can't tell us "last genuinely modified" — the most
    // recent cart_item write is the only trustworthy signal for that.
    prisma.cartItem.findFirst({
      where: { cart: { userId: req.params.id } },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);
  return sendSuccess(res, { ...cart, lastActivityAt: latestItem?.updatedAt ?? null }, 'Customer cart fetched');
});
