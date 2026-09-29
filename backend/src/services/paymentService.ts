import crypto from 'crypto';
import { updateOrderStatus, getOrder } from './orderService';
import { Order } from '../models/order';
import { AppError, ERROR_CODES } from '../types/error';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-webhook-secret';

export interface WebhookPayload {
  orderId: string;
  paymentId: string;
  status: 'succeeded' | 'failed';
  amount: number;
}

export function verifyWebhookSignature(payloadRaw: string, signatureHeader: string): boolean {
  if (!signatureHeader || !payloadRaw) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadRaw)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function processPaymentWebhook(payloadRaw: string, signatureHeader: string): Promise<Order> {
  const isValid = verifyWebhookSignature(payloadRaw, signatureHeader);
  if (!isValid) {
    throw new AppError(ERROR_CODES.PAYMENT_NOT_VALIDATED, 'Invalid payment webhook signature');
  }

  const payload: WebhookPayload = JSON.parse(payloadRaw);
  const order = await getOrder(payload.orderId);

  if (payload.status === 'succeeded') {
    return updateOrderStatus(order.id, 'confirmed', 'paid');
  } else {
    return updateOrderStatus(order.id, 'cancelled', 'failed');
  }
}

export { AppError, ERROR_CODES };
