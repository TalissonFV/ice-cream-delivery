import { addToCart, getCart, updateCart, clearCart } from '../../src/services/cartService';
import * as productService from '../../src/services/productService';
import * as db from '../../src/db';
import { ERROR_CODES } from '../../src/types/error';

jest.mock('../../src/db');
jest.mock('../../src/services/productService');

describe('cartService', () => {
  const mockProduct = {
    id: 1,
    name: 'Chocolate Gelato',
    type: 'ice_cream',
    flavor: 'chocolate',
    price: 12.00,
    supplierId: 1,
    description: 'Rich dark chocolate gelato'
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('addToCart adds new item to cart when item does not exist', async () => {
    (productService.getProduct as jest.Mock).mockResolvedValue(mockProduct);
    (db.queryOne as jest.Mock).mockResolvedValue(null);
    (db.execute as jest.Mock).mockResolvedValue({ rows: 1 });

    const result = await addToCart(1, 1, 2);
    expect(result).toEqual({
      productId: 1,
      productName: 'Chocolate Gelato',
      quantity: 2,
      unitPrice: 12.00
    });
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO cart_items'),
      [1, 1, 'Chocolate Gelato', 2, 12.00]
    );
  });

  test('addToCart throws VALIDATION_ERROR for quantity <= 0', async () => {
    await expect(addToCart(1, 1, 0)).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR
    });
  });

  test('getCart calculates correct total price', async () => {
    (db.query as jest.Mock).mockResolvedValue([
      { productId: 1, productName: 'Chocolate Gelato', quantity: 2, unitPrice: 12.00 }
    ]);

    const cart = await getCart(1);
    expect(cart.customerId).toBe(1);
    expect(cart.totalAmount).toBe(24.00);
    expect(cart.items.length).toBe(1);
  });
});
