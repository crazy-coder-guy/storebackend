import { Request, Response } from 'express';
import * as addressService from '../services/address.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await addressService.listAddresses(req.authUser!.id);
  return sendSuccess(res, addresses, 'Addresses fetched');
});

export const saveAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressService.saveAddress(req.authUser!.id, req.body);
  return sendSuccess(res, address, 'Address saved', 201);
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await addressService.deleteAddress(req.authUser!.id, req.params.id);
  return sendSuccess(res, null, 'Address deleted');
});
