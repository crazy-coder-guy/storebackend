import { Router } from 'express';
import { deleteAddress, listAddresses, saveAddress } from '../controllers/address.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { saveAddressSchema } from '../validation/address.validation';

const router = Router();

router.use(requireAuth);

router.get('/', listAddresses);
router.post('/', validate(saveAddressSchema), saveAddress);
router.delete('/:id', deleteAddress);

export default router;
