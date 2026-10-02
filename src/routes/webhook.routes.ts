import { Router } from 'express';
import { razorpayWebhook } from '../controllers/payment.controller';

const router = Router();

// Called by Razorpay directly (server-to-server), never by a browser — no
// requireAuth here, the request is authenticated by its HMAC signature
// instead (verified inside razorpayWebhook against the raw body).
router.post('/razorpay', razorpayWebhook);

export default router;
