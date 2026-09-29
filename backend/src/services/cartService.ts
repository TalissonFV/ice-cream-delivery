import { query, queryOne, execute } from '../db';
import { Cart, CartItem } from '../models/cart';
import { getProduct } from './productService';
import { AppError, ERROR_CODES } from '../types/error';

export async function getCart(customerId: number): Promise<Cart> {
  const sql = 'SELECT product_id AS "productId", product_name AS "productName", quantity, unit_price AS "unitPrice" FROM cart_items WHERE customer_id = $1';
  const items = await query<CartItem>(sql, [customerId]);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  return {
    customerId,
    items,
    totalAmount: Number(totalAmount.toFixed(2))
  };
}

export async function addToCart(customerId: number, productId: number, quantity: number): Promise<CartItem> {
  if (quantity <= 0) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Quantity must be greater than zero');
  }

  const product = await getProduct(productId);
  const existing = await queryOne<CartItem>(
    'SELECT quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2',
    [customerId, productId]
  );

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    await execute(
      'UPDATE cart_items SET quantity = $1 WHERE customer_id = $2 AND product_id = $3',
      [newQuantity, customerId, productId]
    );
    return {
      productId,
      productName: product.name,
      quantity: newQuantity,
      unitPrice: product.price
    };
  } else {
    await execute(
      'INSERT INTO cart_items (customer_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
      [customerId, productId, product.name, quantity, product.price]
    );
    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice: product.price
    };
  }
}

export async function updateCart(customerId: number, items: CartItem[]): Promise<Cart> {
  await execute('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);
  for (const item of items) {
    if (item.quantity > 0) {
      await execute(
        'INSERT INTO cart_items (customer_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [customerId, item.productId, item.productName, item.quantity, item.unitPrice]
      );
    }
  }
  return getCart(customerId);
}

export async function clearCart(customerId: number): Promise<void> {
  await execute('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);
}

export { AppError, ERROR_CODES };
