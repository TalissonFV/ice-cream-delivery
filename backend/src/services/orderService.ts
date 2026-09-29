import { query, queryOne, execute } from '../db';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '../models/order';
import { clearCart } from './cartService';
import { AppError, ERROR_CODES } from '../types/error';

export interface CreateOrderInput {
  customerId: number;
  items: OrderItem[];
  totalAmount: number;
}

export async function placeOrder(input: CreateOrderInput): Promise<Order> {
  if (!input.items || input.items.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Order must contain at least one item');
  }

  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orderNumber = `IC-${Math.floor(100000 + Math.random() * 900000)}`;
  const status: OrderStatus = 'pending';
  const paymentStatus: PaymentStatus = 'unpaid';
  const createdAt = new Date().toISOString();

  // Transactional order creation
  await execute('BEGIN');
  try {
    await execute(
      `INSERT INTO orders (id, order_number, customer_id, items, total_amount, status, payment_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orderId,
        orderNumber,
        input.customerId,
        JSON.stringify(input.items),
        input.totalAmount,
        status,
        paymentStatus,
        createdAt
      ]
    );

    for (const item of input.items) {
      await execute(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.productName, item.quantity, item.unitPrice]
      );
    }

    await clearCart(input.customerId);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }

  return {
    id: orderId,
    orderNumber,
    customerId: input.customerId,
    items: input.items,
    totalAmount: input.totalAmount,
    status,
    paymentStatus,
    createdAt
  };
}

export async function getOrder(orderId: string): Promise<Order> {
  const sql = `SELECT id, order_number AS "orderNumber", customer_id AS "customerId", items, total_amount AS "totalAmount", status, payment_status AS "paymentStatus", created_at AS "createdAt" FROM orders WHERE id = $1`;
  const order = await queryOne<Order>(sql, [orderId]);
  if (!order) {
    throw new AppError(ERROR_CODES.ORDER_NOT_FOUND, `Order ${orderId} not found`);
  }
  if (typeof order.items === 'string') {
    order.items = JSON.parse(order.items as unknown as string);
  }
  order.totalAmount = Number(order.totalAmount);
  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus): Promise<Order> {
  const existing = await getOrder(orderId);
  const newPaymentStatus = paymentStatus || existing.paymentStatus;

  await execute(
    'UPDATE orders SET status = $1, payment_status = $2 WHERE id = $3',
    [status, newPaymentStatus, orderId]
  );

  return getOrder(orderId);
}

export { AppError, ERROR_CODES };
