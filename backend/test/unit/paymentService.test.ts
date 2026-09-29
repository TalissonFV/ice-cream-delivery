import crypto from 'crypto';
import { verifyWebhookSignature, processPaymentWebhook } from '../../src/services/paymentService';
import * as orderService from '../../src/services/orderService';
import { ERROR_CODES } from '../../src/types/error';

jest.mock('../../src/services/orderService');

describe('paymentService', () => {
  const secret = 'dev-webhook-secret';
  const payloadObj = {
    orderId: 'ORD-12345',
    paymentId: 'PAY-999',
    status: 'succeeded',
    amount: 25.00
  };
  const rawPayload = JSON.stringify(payloadObj);

  function signPayload(body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('verifyWebhookSignature returns true for valid HMAC signature', () => {
    const validSig = signPayload(rawPayload);
    expect(verifyWebhookSignature(rawPayload, validSig)).toBe(true);
  });

  test('verifyWebhookSignature returns false for tampered payload or bad signature', () => {
    const validSig = signPayload(rawPayload);
    expect(verifyWebhookSignature(rawPayload + 'tampered', validSig)).toBe(false);
    expect(verifyWebhookSignature(rawPayload, 'invalid_signature_hex')).toBe(false);
  });

  test('processPaymentWebhook rejects invalid signature before updating order status', async () => {
    await expect(
      processPaymentWebhook(rawPayload, 'invalid-signature')
    ).rejects.toMatchObject({
      code: ERROR_CODES.PAYMENT_NOT_VALIDATED
    });

    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
  });

  test('processPaymentWebhook updates order status when signature is valid', async () => {
    const validSig = signPayload(rawPayload);
    (orderService.getOrder as jest.Mock).mockResolvedValue({ id: 'ORD-12345', status: 'pending' });
    (orderService.updateOrderStatus as jest.Mock).mockResolvedValue({ id: 'ORD-12345', status: 'confirmed', paymentStatus: 'paid' });

    const result = await processPaymentWebhook(rawPayload, validSig);
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('ORD-12345', 'confirmed', 'paid');
    expect(result.status).toBe('confirmed');
  });
});
