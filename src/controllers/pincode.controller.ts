import { Request, Response } from 'express';
import * as pincodeService from '../services/pincode.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const lookupPincode = asyncHandler(async (req: Request, res: Response) => {
  const result = await pincodeService.lookupPincode(req.params.code);
  return sendSuccess(res, result, 'Pincode resolved');
});
