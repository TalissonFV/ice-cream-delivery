import { query, queryOne } from '../db';
import { Product } from '../models/product';
import { AppError, ERROR_CODES } from '../types/error';

export interface ProductQuery {
  type?: string;
  flavor?: string;
  limit?: number;
  offset?: number;
}

export async function listProducts(filter: ProductQuery = {}): Promise<Product[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.type) {
    params.push(filter.type);
    clauses.push(`type = $${params.length}`);
  }
  if (filter.flavor) {
    params.push(filter.flavor);
    clauses.push(`flavor = $${params.length}`);
  }

  let sql = 'SELECT id, name, type, flavor, price, supplier_id AS "supplierId", description FROM products';
  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }
  sql += ' ORDER BY id';

  if (filter.limit) {
    params.push(filter.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (filter.offset) {
    params.push(filter.offset);
    sql += ` OFFSET $${params.length}`;
  }

  return query<Product>(sql, params);
}

export async function getProduct(id: number): Promise<Product> {
  const sql = 'SELECT id, name, type, flavor, price, supplier_id AS "supplierId", description FROM products WHERE id = $1';
  const product = await queryOne<Product>(sql, [id]);
  if (!product) {
    throw new AppError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  }
  return product;
}

export { AppError, ERROR_CODES };
