import { Router } from 'express';
import { getSettings, recommendPrice, updateSettings } from '../controllers/pricing.controller';
import { validate } from '../middleware/validate';
import { recommendPriceSchema, updatePricingSettingsSchema } from '../validation/pricing.validation';

const router = Router();

// Admin-facing only — these costs/margins must never reach the storefront.
router.get('/settings', getSettings);
router.patch('/settings', validate(updatePricingSettingsSchema), updateSettings);
router.post('/recommend', validate(recommendPriceSchema), recommendPrice);

export default router;
