import { placeOrder, getOrder, updateOrderStatus } from '../../src/services/orderService';
import * as db from '../../src/db';
import { ERROR_CODES } from '../../src/types/error';

jest.mock('../../src/db');

describe('orderService', () => {
  const mockItem = {
    productId: 1,
    productName: 'Strawberry Ice Cream',
    quantity: 2,
    unitPrice: 8.50
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('placeOrder creates order inside transaction and rolls back on failure', async () => {
    (db.execute as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('order_items')) {
        throw new Error('Database write error');
      }
      return { rows: 1 };
    });

    await expect(
      placeOrder({ customerId: 1, items: [mockItem], totalAmount: 17.00 })
    ).rejects.toThrow('Database write error');

    expect(db.execute).toHaveBeenCalledWith('BEGIN');
    expect(db.execute).toHaveBeenCalledWith('ROLLBACK');
  });

  test('placeOrder succeeds and commits transaction on valid input', async () => {
    (db.execute as jest.Mock).mockResolvedValue({ rows: 1 });

    const order = await placeOrder({
      customerId: 1,
      items: [mockItem],
      totalAmount: 17.00
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe('pending');
    expect(order.paymentStatus).toBe('unpaid');
    expect(db.execute).toHaveBeenCalledWith('BEGIN');
    expect(db.execute).toHaveBeenCalledWith('COMMIT');
  });

  test('getOrder throws ORDER_NOT_FOUND if order does not exist', async () => {
    (db.queryOne as jest.Mock).mockResolvedValue(null);

    await expect(getOrder('INVALID_ID')).rejects.toMatchObject({
      code: ERROR_CODES.ORDER_NOT_FOUND
    });
  });
});
