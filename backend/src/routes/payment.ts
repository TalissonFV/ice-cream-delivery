import { Router, Request, Response, NextFunction } from 'express';
import { processPaymentWebhook } from '../services/paymentService';
import { ApiResponse } from '../types/error';

const router = Router();

router.post('/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = (req.headers['x-payment-signature'] || req.headers['authorization']) as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const updatedOrder = await processPaymentWebhook(rawBody, signature || '');

    const response: ApiResponse = {
      code: 'SUCCESS',
      data: updatedOrder,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
