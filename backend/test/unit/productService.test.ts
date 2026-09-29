import { listProducts, getProduct } from '../../src/services/productService';
import * as db from '../../src/db';
import { ERROR_CODES } from '../../src/types/error';

jest.mock('../../src/db');

describe('productService', () => {
  const mockProduct = {
    id: 1,
    name: 'Vanilla Bean Ice Cream',
    type: 'ice_cream',
    flavor: 'vanilla',
    price: 9.99,
    supplierId: 10,
    description: 'Classic rich vanilla ice cream'
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('listProducts queries database and returns array of products', async () => {
    (db.query as jest.Mock).mockResolvedValue([mockProduct]);

    const result = await listProducts({ type: 'ice_cream' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual([mockProduct]);
  });

  test('getProduct returns product if found in DB', async () => {
    (db.queryOne as jest.Mock).mockResolvedValue(mockProduct);

    const product = await getProduct(1);
    expect(db.queryOne).toHaveBeenCalledWith(expect.any(String), [1]);
    expect(product).toEqual(mockProduct);
  });

  test('getProduct throws PRODUCT_NOT_FOUND if not in DB', async () => {
    (db.queryOne as jest.Mock).mockResolvedValue(null);

    await expect(getProduct(999)).rejects.toMatchObject({
      code: ERROR_CODES.PRODUCT_NOT_FOUND
    });
  });
});
