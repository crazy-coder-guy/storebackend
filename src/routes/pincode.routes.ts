import { Router } from 'express';
import { lookupPincode } from '../controllers/pincode.controller';

const router = Router();

// Public read-only utility — no auth needed, used while filling the
// checkout address form before the shopper is necessarily signed in yet.
router.get('/:code', lookupPincode);

export default router;
