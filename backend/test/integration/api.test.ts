import request from 'supertest';
import { createApp } from '../../src/app';
import * as db from '../../src/db';

jest.mock('../../src/db');

describe('API Integration Endpoints', () => {
  const app = createApp();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('returns JWT token on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('SUCCESS');
      expect(res.body.data.token).toBeDefined();
    });

    test('returns 400 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products', () => {
    test('returns catalog list', async () => {
      (db.query as jest.Mock).mockResolvedValue([
        { id: 1, name: 'Vanilla Bean', type: 'ice_cream', price: '5.00' }
      ]);

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe('SUCCESS');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/orders/checkout', () => {
    test('creates order and clears cart transactionally', async () => {
      (db.execute as jest.Mock).mockResolvedValue({ rows: 1 });

      const res = await request(app)
        .post('/api/orders/checkout')
        .send({
          customerId: 1,
          items: [{ productId: 1, productName: 'Vanilla', quantity: 2, unitPrice: 5.00 }],
          totalAmount: 10.00
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('SUCCESS');
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('pending');
    });
  });
});
