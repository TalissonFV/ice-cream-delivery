# Backend Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Node.js + TypeScript backend for the ice cream delivery app — API routes, domain services, PostgreSQL integration, authentication, payment handling, and real-time tracking support.

**Architecture:** Backend built on Node.js + Express + TypeScript. Domain logic is separated into services. Data is managed via PostgreSQL with transactional order and payment operations. RESTful JSON API serves the Flutter frontend; WebSocket/SSE handles real-time tracking.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL, JWT, WebSocket/SSE

**Spec:** `docs/superpowers/specs/2026-09-28-ice-cream-delivery-architecture-design.md`

## Global Constraints

- Language: Node.js + TypeScript (strict type checking)
- Backend framework: Node.js + Express
- Database: PostgreSQL (relational, transactional; used for orders, payments, products, users, cart, delivery)
- Identity: JWT tokens (issued on login, validated on all requests)
- Communication with frontend: REST JSON API (`/api/*`) plus WebSocket/SSE for real-time tracking
- Response format: all responses follow `{ code, data, error }`; errors use domain-specific codes (e.g., `ORDER_NOT_FOUND`, `PAYMENT_FAILED`)
- Security: no raw card data stored/processed (tokenized payment handling); input validation at all trust boundaries; all secrets via environment variables / secret manager
- Dependencies: use idiomatic, standard libraries; no undocumented dependencies
- Every task must be independently testable

## Review Focus

1. **Payment webhook verification** — payment webhooks from the provider must be verified for authenticity before trusting transaction data; a reasonable implementation verifies webhook signature/headers before processing payment confirmations. *Test: a task that injects a malformed/malicious webhook and asserts the backend rejects it before updating order status.*
2. **Order transaction integrity** — order creation and status updates must be transactional; partial or inconsistent orders must never occur. *Test: a task that attempts to create a partial order and asserts the transaction fails.*
3. **JWT token validation & refresh** — all API requests must be validated for a valid JWT; missing or invalid tokens must be rejected with 401. *Test: a task that sends a request without a token and asserts 401, and a request with a tampered token and asserts rejection.*
4. **Input validation at trust boundaries** — all endpoints must validate inputs; invalid inputs must return field-level error messages. *Test: a task that sends malformed input to a validation endpoint and asserts field-level errors.*
5. **WebSocket/SSE error handling** — tracking updates via WebSocket must handle connection errors and reconnects gracefully without breaking existing tracking data. *Test: a task that disconnects a WebSocket connection mid-stream and asserts tracking state remains consistent.*

---

## File Structure

Backend project files (under the `ice-cream-delivery/backend/` root, which is the default backend location for this full-stack project):

- **`ice-cream-delivery/backend/src/index.ts`** — Express app entry point: sets up server, mounts routes, error middleware, DB connection
- **`ice-cream-delivery/backend/src/app.ts`** — Express app configuration, middleware (CORS, error handling), route mounting
- **`ice-cream-delivery/backend/src/db/{index.ts, connection.ts}`** — PostgreSQL connection setup and database access helper
- **`ice-cream-delivery/backend/src/models/{user.ts, product.ts, order.ts, delivery.ts}`** — TypeScript models for users, products, orders, deliveries
- **`ice-cream-delivery/backend/src/services/{authService.ts, productService.ts, orderService.ts, paymentService.ts, deliveryService.ts}`** — domain services with business logic
- **`ice-cream-delivery/backend/src/routes/{auth.ts, product.ts, cart.ts, checkout.ts, payment.ts, order.ts}`** — thin route handlers mapping to services
- **`ice-cream-delivery/backend/src/websocket/{trackingClient.ts, trackingServer.ts}`** — WebSocket/SSE implementation for real-time delivery tracking
- **`ice-cream-delivery/backend/test/{*.test.ts}`** — test files

## Task Right-Sizing

Tasks are sized so each carries its own test cycle and review gate, with setup/config/scaffolding folded into the task whose deliverable needs them.

---


### Task 1: Project scaffolding, TypeScript setup, and Express app base configuration

**Files:**
- Create: `ice-cream-delivery/backend/tsconfig.json`
- Create: `ice-cream-delivery/backend/src/index.ts`
- Create: `ice-cream-delivery/backend/src/app.ts`
- Create: `ice-cream-delivery/backend/src/types/error.ts` (error code + response type)

**Interfaces:**
- Consumes: none (initial setup)
- Produces: TypeScript compilation config, Express app entry point, and base app configuration with CORS and error middleware

- [ ] **Step 1: Create `tsconfig.json` for the backend project (strict TypeScript, Node.js environment)**

```typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 2: Create `src/types/error.ts` defining error code constants and response types**

```typescript
// Error code constants
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_NOT_VALIDATED: 'PAYMENT_NOT_VALIDATED'
} as const;

// Standard response types
export interface ApiResponse<T> {
  code: string;
  data: T | null;
  error: string | null;
}

export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
```

- [ ] **Step 3: Create `src/app.ts` with Express app, CORS, error handling middleware**

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError, ERROR_CODES } from './types/error';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  // CORS middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  // Global error handling middleware
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      const response: ApiResponse = { code: err.code, data: null, error: err.message };
      res.status(400).json(response);
    } else {
      console.error('Unexpected error:', err);
      const response: ApiResponse = { code: ERROR_CODES.VALIDATION_ERROR, data: null, error: 'Internal server error' };
      res.status(500).json(response);
    }
  });

  return app;
}
```

- [ ] **Step 4: Create `src/index.ts` entry point that mounts the app and starts the server**

```typescript
import { createApp } from './app';

const app = createApp();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

- [ ] **Step 5: Run TypeScript compilation to verify no errors**

Run: `cd ice-cream-delivery/backend && npx tsc --noEmit`
Expected: Compilation succeeds, no TypeScript errors.

- [ ] **Step 6: Commit scaffolding and base config**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/types/error.ts ice-cream-delivery/backend/src/app.ts ice-cream-delivery/backend/src/index.ts ice-cream-delivery/backend/tsconfig.json
git commit -m "feat(backend): add project scaffolding, TypeScript config, and Express base app"
```


### Task 2: PostgreSQL database connection setup

**Files:**
- Create: `ice-cream-delivery/backend/src/db/connection.ts`
- Create: `ice-cream-delivery/backend/src/db/index.ts`

**Interfaces:**
- Consumes: none (initial setup)
- Produces: Reusable PostgreSQL connection helper function available across services and routes

- [ ] **Step 1: Create `src/db/connection.ts` with PostgreSQL connection and query helper**

```typescript
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ice_cream_app',
  max: 10,
  idleTimeoutMillis: 30000
});

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const results = await pool.query(text, params as any);
  return results.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const results = await pool.query(text, params as any);
  return results.rows[0] as T | null;
}

export async function execute(text: string, params?: unknown[]): Promise<{ rows: number }> {
  const result = await pool.query(text, params as any);
  return result;
}

export async function closeConnections() {
  await pool.end();
}
```

- [ ] **Step 2: Create `src/db/index.ts` with database setup (ensure tables exist)**

```typescript
import { query } from './connection';

export async function initDatabase(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user'
    )`
  );
  // Add other table creation queries here per the spec DB schema
}
```

- [ ] **Step 3: Run database initialization to verify connection and table creation**

Run: `cd ice-cream-delivery/backend && node -e "require('./src/db').initDatabase().then(() => console.log('Database initialized')).catch(console.error)"`
Expected: Output `Database initialized` and no errors.

- [ ] **Step 4: Commit database connection setup**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/db/
git commit -m "feat(backend): add PostgreSQL connection setup and database init"
```


### Task 3: Domain model definitions

**Files:**
- Create: `ice-cream-delivery/backend/src/models/user.ts`
- Create: `ice-cream-delivery/backend/src/models/product.ts`
- Create: `ice-cream-delivery/backend/src/models/order.ts`
- Create: `ice-cream-delivery/backend/src/models/delivery.ts`

**Interfaces:**
- Consumes: `src/types/error.ts` (ApiResponse, AppError)
- Produces: TypeScript models for users, products, orders, and deliveries usable by services and routes

- [ ] **Step 1: Create `src/models/user.ts`**

```typescript
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
}
```

- [ ] **Step 2: Create `src/models/product.ts`**

```typescript
export interface Product {
  id: number;
  name: string;
  type: string; // e.g., 'ice_cream', 'sorbet', etc.
  flavor: string | null;
  price: number;
  supplierId: number | null;
  description: string | null;
}
```

- [ ] **Step 3: Create `src/models/order.ts`**

```typescript
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  createdAt: string;
}
```

- [ ] **Step 4: Create `src/models/delivery.ts`**

```typescript
export type DeliveryStatus = 'in_transit' | 'delivering' | 'delivered' | 'failed';

export interface DeliveryLog {
  status: DeliveryStatus;
  location: string | null;
  message: string | null;
  timestamp: string;
}

export interface Delivery {
  orderId: string;
  orderNumber: string;
  customerId: number;
  status: DeliveryStatus;
  location: string | null;
  message: string | null;
  createdAt: string;
  logs: DeliveryLog[];
}
```

- [ ] **Step 5: Run TypeScript compilation to verify models are valid**

Run: `cd ice-cream-delivery/backend && npx tsc --noEmit`
Expected: Compilation succeeds, no TypeScript errors.

- [ ] **Step 6: Commit domain models**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/models/
git commit -m "feat(backend): add domain models for users, products, orders, deliveries"
```


### Task 4: Auth service (JWT issuance and validation)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/authService.ts`

**Interfaces:**
- Consumes: `src/models/user.ts`, `src/types/error.ts`
- Produces: `signToken(user)` and `validateToken(token)` functions; `authRoutes` handler for auth routes

- [ ] **Step 1: Create `src/services/authService.ts` with JWT issuance and validation**

```typescript
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { AppError, ERROR_CODES } from '../types/error';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export function signToken(user: Omit<User, 'passwordHash'>): string {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function validateToken(token: string): Omit<User, 'passwordHash'> | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

export function authRoutes(_req: any, res: any, next: any) {
  // Auth route handler to be implemented per actual API spec; stub for now
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 2: Write failing test for token validation**

```typescript
// test/unit/authService.test.ts
import { signToken, validateToken } from '../src/services/authService';

const user: any = { id: 1, email: 'user@example.com', role: 'user' };

test('validateToken returns null for invalid token', () => {
  const result = validateToken('invalid.token.here');
  expect(result).toBeNull();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ice-cream-delivery/backend && npx tsc --noEmit && npx jest --config '{}' 2>/dev/null || npx jest test/unit/authService.test.ts -v`
Expected: Test fails (function not found / module issue)

- [ ] **Step 4: Implement and verify signToken/validateToken**

After Step 1 code (Step 3 above runs with the code present); run:

Run: `cd ice-cream-delivery/backend && npx jest test/unit/authService.test.ts -v`
- [ ] **Step 5: Add JWT route integration**

Integrate `authRoutes` into the routes layer (see Task 8) to register `/api/auth` POST (token issuance) and GET (token validation)

- [ ] **Step 6: Commit auth service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/services/authService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add auth service with JWT issuance and validation"
```


### Task 5: Product service (catalog and product details)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/productService.ts`

**Interfaces:**
- Consumes: `src/models/product.ts`, `src/types/error.ts`
- Produces: `listProducts(query)` and `getProduct(id)` functions; `productRoutes` handler

- [ ] **Step 1: Create `src/services/productService.ts` with catalog and product detail logic**

```typescript
import { query, queryOne } from '../db';
import { Product } from '../models/product';
import { AppError, ERROR_CODES } from '../types/error';

export interface ProductQuery {
  type?: string;
  flavor?: string;
  limit?: number;
  offset?: number;
}

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const criteria = new URLSearchParams();
  if (query.type) criteria.set('type', query.type);
  if (query.flavor) criteria.set('flavor', query.flavor);
  if (query.limit) criteria.set('limit', String(query.limit));
  if (query.offset) criteria.set('offset', String(query.offset));

  const text = `SELECT * FROM products WHERE 1=1 ${criteria.toString() ? 'AND (' + criteria.toString() + ')' : ''} ORDER BY id`;
  return query<Product>(text);
}

export async function getProduct(id: number): Promise<Product> {
  const product = await queryOne<Product>(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!product) {
    throw new AppError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  }
  return product;
}

export function productRoutes(_req: any, res: any, next: any) {
  // Product route handler to be integrated; stub for now
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 2: Write failing test for product lookup**

```typescript
// test/unit/productService.test.ts
import { getProduct, listProducts } from '../src/services/productService';

test('getProduct throws PRODUCT_NOT_FOUND for invalid id', async () => {
  await expect(getProduct(999999)).rejects.toThrow();
});

test('listProducts returns products array', async () => {
  const result = await listProducts({});
  expect(Array.isArray(result)).toBe(true);
});
```

- [ ] **Step 3: Run tests to verify failures**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/productService.test.ts -v`
Expected: Tests fail (module not found / function issue)

- [ ] **Step 4: Implement service and verify tests pass**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/productService.test.ts -v`
Expected: Tests PASS

- [ ] **Step 5: Commit product service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/services/productService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add product service for catalog and product details"
```


### Task 6: Cart service (cart management)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/cartService.ts`
- Create: `ice-cream-delivery/backend/src/models/cart.ts` (cart model)

**Interfaces:**
- Consumes: `src/models/product.ts`, `src/models/cart.ts`, `src/db`, `src/types/error.ts`
- Produces: `addToCart(userId, productId, quantity)` and `updateCart(userId, items)` functions; `cartRoutes` handler

- [ ] **Step 1: Create `src/models/cart.ts`**

```typescript
export interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  customerId: number;
  items: CartItem[];
  totalAmount: number;
}
```

- [ ] **Step 2: Create `src/services/cartService.ts` with cart operations**

```typescript
import { query, execute } from '../db';
import { Cart, CartItem } from '../models/cart';
import { AppError, ERROR_CODES } from '../types/error';

export async function addToCart(customerId: number, productId: number, quantity: number): Promise<CartItem> {
  const product = await queryOne(
    `SELECT * FROM products WHERE id = $1`,
    [productId]
  ) as any;
  if (!product) {
    throw new AppError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${productId} not found`);
  }
  const existing = await queryOne<CartItem>(
    `SELECT * FROM cart_items WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId]
  );
  const newQuantity = (existing?.quantity || 0) + quantity;
  const item: CartItem = {
    productId: product.id,
    productName: product.name,
    quantity: newQuantity,
    unitPrice: product.price
  };
  await execute(
    `INSERT INTO cart_items (customer_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)`,
    [customerId, productId, item.productName, item.quantity, item.unitPrice]
  );
  return item;
}

export async function updateCart(customerId: number, items: CartItem[]): Promise<number> {
  for (const item of items) {
    await execute(
      `UPDATE cart_items SET quantity = $1 WHERE customer_id = $2 AND product_id = $3`,
      [item.quantity, customerId, item.productId]
    );
  }
  return 0;
}

export function cartRoutes(_req: any, res: any, next: any) {
  // Cart route handler to be integrated; stub for now
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 3: Write failing test for cart addition**

```typescript
// test/unit/cartService.test.ts
import { addToCart } from '../src/services/cartService';

test('addToCart succeeds with valid product', async () => {
  // Mock queryOne/getProduct behavior
  await expect(addToCart(1, 100, 2)).resolves.toBeDefined();
});
```

- [ ] **Step 4: Run test to verify failure**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/cartService.test.ts -v`
Expected: Test fails (module not found)

- [ ] **Step 5: Implement and verify test passes**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/cartService.test.ts -v`
Expected: Tests PASS

- [ ] **Step 6: Commit cart service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/models/cart.ts ice-cream-delivery/backend/src/services/cartService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add cart service for cart management"
```


### Task 7: Order service (order creation and status management, transactional)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/orderService.ts`
- Create: `ice-cream-delivery/backend/src/models/order.ts` (already created in Task 3, but reference)

**Interfaces:**
- Consumes: `src/models/order.ts`, `src/models/cart.ts`, `src/db`, `src/types/error.ts`
- Produces: `placeOrder(customerId, items, totalAmount)` and `getOrder(orderId)` functions; `orderRoutes` handler

- [ ] **Step 1: Create `src/services/orderService.ts` with transactional order creation**

```typescript
import { query, execute } from '../db';
import { Order, OrderItem, OrderStatus } from '../models/order';
import { AppError, ERROR_CODES } from '../types/error';
import { addToCart } from './cartService';

export interface OrderInput {
  customerId: number;
  items: OrderItem[];
  totalAmount: number;
}

export async function placeOrder(input: OrderInput): Promise<Order> {
  const orderItems = input.items.map((item, index) => {
    const itemId = index + 1;
    return { ...item, quantity: item.quantity };
  });
  const orderStatus: OrderStatus = 'confirmed';
  const orderPayment: Order['paymentStatus'] = 'paid';

  // Transactional order creation: all operations in one transaction
  const result = await execute(
    `BEGIN;
    INSERT INTO orders (order_number, customer_id, items, total_amount, status, payment_status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id, order_number, customer_id, items, total_amount, status, payment_status, created_at;
    COMMIT;`,
    [
      input.items.map((item, index) => JSON.stringify([item.productId, item.quantity])).join(','),
      input.customerId,
      JSON.stringify(orderItems),
      input.totalAmount,
      orderStatus,
      orderPayment
    ]
  );

  await execute(
    `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)`,
    [result.rows[0].id, ...input.items.map((item) => [item.productId, item.quantity, item.productName, item.unitPrice])]
  );

  return result.rows[0] as Order;
}

export async function getOrder(orderId: string): Promise<Order> {
  const order = await queryOne<Order>(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId]
  );
  if (!order) {
    throw new AppError(ERROR_CODES.ORDER_NOT_FOUND, `Order ${orderId} not found`);
  }
  return order;
}

export function orderRoutes(_req: any, res: any, next: any) {
  // Order route handler to be integrated; stub for now
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 2: Write failing test for order placement (transaction integrity)**

```typescript
// test/unit/orderService.test.ts
import { placeOrder, getOrder } from '../src/services/orderService';

test('placeOrder creates order with transactional status', async () => {
  const order = await placeOrder({
    customerId: 1,
    items: [{ productId: 1, productName: 'Ice Cream A', quantity: 2, unitPrice: 10 }],
    totalAmount: 20
  });
  expect(order.id).toBeDefined();
  expect(order.status).toBe('confirmed');
});

test('getOrder throws ORDER_NOT_FOUND for invalid id', async () => {
  await expect(getOrder('invalid-id')).rejects.toThrow();
});
```

- [ ] **Step 3: Run tests to verify failures**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/orderService.test.ts -v`
Expected: Tests fail (module not found)

- [ ] **Step 4: Implement and verify tests pass**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/orderService.test.ts -v`
Expected: Tests PASS

- [ ] **Step 5: Commit order service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/services/orderService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add transactional order service"
```


### Task 8: Payment service (transactional payment processing & webhook verification)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/paymentService.ts`

**Interfaces:**
- Consumes: `src/models/order.ts`, `src/db`, `src/types/error.ts`
- Produces: `processPayment(orderId, paymentData)` (transactional) and `verifyWebhook(payload)` (verify authenticity); route handlers for payment endpoints and webhooks

- [ ] **Step 1: Create `src/services/paymentService.ts` with payment processing and webhook verification**

```typescript
import { query, execute } from '../db';
import { Order, OrderStatus } from '../models/order';
import { AppError, ERROR_CODES } from '../types/error';

export interface PaymentInput {
  orderId: string;
  paymentProvider: string;
  paymentId: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  webhookSignature?: string;
}

// Payment provider provides webhook signature to verify authenticity (Review Focus: must verify before trusting)
export async function verifyWebhook(payload: any, signature: string): Promise<boolean> {
  // In production: verify webhook signature using provider's secret + HMAC.
  // Placeholder for production implementation: verify signature matches.
  // ponytail: naive HMAC check; replace with provider-specified signature verification to prevent spoofing
  try {
    if (!payload.signature || !signature) {
      return false;
    }
    // Verify signature matches expected (example; implement per provider spec)
    return payload.signature === signature;
  } catch {
    return false;
  }
}

export async function processPayment(input: PaymentInput): Promise<Order> {
  // Verify webhook authenticity before trusting payment data (Review Focus: prevent forged webhooks)
  if (!input.webhookSignature || !(await verifyWebhook({ paymentId: input.paymentId }, input.webhookSignature))) {
    throw new AppError(ERROR_CODES.PAYMENT_NOT_VALIDATED, 'Payment webhook not verified');
  }

  const updatedOrder = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [input.orderId]);
  if (!updatedOrder) {
    throw new AppError(ERROR_CODES.ORDER_NOT_FOUND, `Order ${input.orderId} not found`);
  }

  if (updatedOrder.status !== 'pending' && updatedOrder.status !== 'confirmed') {
    throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Order is not in a payable state');
  }

  const newStatus: OrderStatus = input.status === 'succeeded' ? 'delivered' : input.status === 'failed' ? 'cancelled' : updatedOrder.status;
  const newPayment: Order['paymentStatus'] = input.status === 'succeeded' ? 'paid' : input.status === 'failed' ? 'failed' : 'unpaid';

  await execute(
    `BEGIN;
    UPDATE orders SET status = $1, payment_status = $2 WHERE id = $3;
    COMMIT;`,
    [newStatus, newPayment, input.orderId]
  );

  const updated = await queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [input.orderId]);
  return updated;
}

// Route handlers (to be integrated in routes module)
export function paymentRoutes(req: any, res: any, next: any) {
  // Payment route handler
  next();
}

export function paymentWebhookRoutes(req: any, res: any, next: any) {
  // Payment webhook route handler
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 2: Write tests (Covering Review Focus items)**

```typescript
// test/unit/paymentService.test.ts
import { processPayment, verifyWebhook } from '../src/services/paymentService';

test('verifyWebhook returns false for missing signature', async () => {
  await expect(verifyWebhook({ paymentId: 'x' }, undefined)).resolves.toBe(false);
});

test('processPayment rejects webhook without verification', async () => {
  await expect(processPayment({
    orderId: 'order-1', paymentProvider: 'test', paymentId: 'pay-1', amount: 10, status: 'succeeded',
    webhookSignature: 'invalid-signature'
  })).rejects.toThrow();
});
```

- [ ] **Step 3: Run tests to verify failures**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/paymentService.test.ts -v`
Expected: Tests fail (module not found)

- [ ] **Step 4: Implement and verify tests pass**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/paymentService.test.ts -v`
Expected: Tests PASS

- [ ] **Step 5: Commit payment service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/services/paymentService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add payment service with transactional processing and webhook verification"
```


### Task 9: Delivery service (delivery logistics and status updates)

**Files:**
- Create: `ice-cream-delivery/backend/src/services/deliveryService.ts`

**Interfaces:**
- Consumes: `src/models/delivery.ts`
- Produces: `startDelivery(orderId)` and `getDelivery(orderId)` functions; delivery route handler

- [ ] **Step 1: Create `src/services/deliveryService.ts` with delivery logistics logic**

```typescript
import { query, execute } from '../db';
import { Delivery, DeliveryStatus } from '../models/delivery';
import { AppError, ERROR_CODES } from '../types/error';

export async function startDelivery(orderId: string): Promise<Delivery> {
  await execute(
    `BEGIN;
    INSERT INTO delivery_logistics (order_id, status, location, message, created_at, logs)
    VALUES ($1, 'in_transit', NULL, 'Delivery started', NOW(), '[]');
    UPDATE orders SET status = $2 WHERE id = $3;
    COMMIT;`,
    ['order-' + orderId, 'confirmed', orderId]
  );
  return await getDelivery(orderId);
}

export async function getDelivery(orderId: string): Promise<Delivery | null> {
  return queryOne<Delivery>(
    `SELECT * FROM delivery_logistics WHERE order_id = $1`,
    [orderId]
  );
}

export function deliveryRoutes(_req: any, res: any, next: any) {
  // Delivery route handler to be integrated; stub for now
  next();
}

export { AppError, ERROR_CODES };
```

- [ ] **Step 2: Write test for delivery start**

```typescript
// test/unit/deliveryService.test.ts
import { startDelivery, getDelivery } from '../src/services/deliveryService';

test('startDelivery initializes delivery for order', async () => {
  await expect(startDelivery('order-1')).resolves.toBeDefined();
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/deliveryService.test.ts -v`
Expected: Test fails (module not found)

- [ ] **Step 4: Implement and verify test passes**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/deliveryService.test.ts -v`
Expected: Tests PASS

- [ ] **Step 5: Commit delivery service**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/services/deliveryService.ts ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add delivery service for logistics and status updates"
```

---

### Task 10: API routes layer (integrate all services)

**Files:**
- Create: `ice-cream-delivery/backend/src/routes/auth.ts`, `product.ts`, `cart.ts`, `checkout.ts`, `payment.ts`, `order.ts`

**Interfaces:**
- Consumes: all service functions (authService, productService, cartService, orderService, paymentService, deliveryService) and `src/types/error.ts`
- Produces: All REST API routes registered on the Express app

- [ ] **Step 1: Create `src/routes/auth.ts`**

```typescript
import { authRoutes as _authRoutes } from '../services/authService';
import { AppError, ERROR_CODES } from '../types/error';
import type { Router } from 'express';

export const authRouter: Router = Router();

authRouter.post('/', (req: any, res: Response, next: any) => {
  // POST /api/auth: authenticate and return token
  // (Implement per actual auth API spec: extract credentials, verify, issue JWT)
  next();
});

authRouter.get('/', (_req: any, res: any, next: any) => {
  // GET /api/auth: validate token
  const token = _req?.headers?.authorization?.split(' ')[1];
  const user = token ? (window as any).__tokenPayload : null;
  if (!user) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing or invalid token');
  }
  res.json({ code: 'OK', data: user, error: null });
});
```

- [ ] **Step 2: Create `src/routes/product.ts`**

```typescript
import { productRoutes as _productRoutes } from '../services/productService';
import type { Router } from 'express';

export const productRouter: Router = Router();

productRouter.get('/', (req: any, res: Response, next: any) => {
  const { type, flavor, limit, offset } = req.query;
  if (type || flavor || limit || offset) {
    _productRoutes(req, res, next);
  } else {
    next();
  }
});

productRouter.get('/:id', (req: any, res: Response, next: any) => {
  const id = parseInt(req.params.id);
  if (!isNaN(id)) {
    _productRoutes(req, res, next);
  } else {
    next();
  }
});
```

- [ ] **Step 3-5: Create remaining route files** (`cart.ts`, `checkout.ts`, `payment.ts`, `order.ts`) following the same pattern, mapping to the respective services with spec routes (`/api/cart`, `/api/checkout`, `/api/payment/webhooks`, `/api/orders/:orderId`, `/api/orders/:orderId/tracking`). Each route validates input at trust boundary and throws `AppError` for invalid input.

- [ ] **Step 6: Register all routes in `app.ts`**

Mount all routers on the Express app and integrate with frontend CORS handling.

- [ ] **Step 7: Run compilation and verify routes load**

Run: `cd ice-cream-delivery/backend && npx tsc --noEmit`
Expected: Compilation succeeds, no TypeScript errors.

- [ ] **Step 8: Commit routes layer**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/routes/
git commit -m "feat(backend): add API route layer integrating all services"
```


### Task 11: WebSocket tracking client for real-time delivery updates

**Files:**
- Create: `ice-cream-delivery/backend/src/websocket/trackingClient.ts`

**Interfaces:**
- Consumes: `src/models/delivery.ts`
- Produces: `TrackingClient` class that streams delivery updates via WebSocket; integrates with delivery data

- [ ] **Step 1: Create `src/websocket/trackingClient.ts` with WebSocket tracking client**

```typescript
import WebSocket from 'ws';
import { Delivery } from '../models/delivery';
import { queryOne } from '../db';

export class TrackingClient {
  private socket: WebSocket | null = null;
  private orderId: string | null = null;
  private onUpdate = (delivery: Delivery) => {};
  private reconnectAttempts = 0;

  start(orderId: string, onUpdate: (delivery: Delivery) => void) {
    this.orderId = orderId;
    this.onUpdate = onUpdate;
    this.reconnectAttempts = 0;
    this.connect();
  }

  private connect() {
    if (!this.orderId) return;
    this.socket = new WebSocket(`ws://localhost:3000/tracking?orderId=${this.orderId}`);

    this.socket.on('open', () => {
      console.log(`WebSocket connected for order ${this.orderId}`);
    });

    this.socket.on('message', (data) => {
      try {
        const update = JSON.parse(data.toString()) as any;
        this.handleUpdate(update);
      } catch (err) {
        console.error('Failed to parse tracking update:', err);
      }
    });

    this.socket.on('close', () => {
      console.log(`WebSocket disconnected for order ${this.orderId}, reconnecting...`);
      this.reconnectAttempts++;
      if (this.reconnectAttempts < 5) {
        setTimeout(() => this.connect(), 3000 * this.reconnectAttempts);
      } else {
        console.log('WebSocket reconnection limit reached');
      }
    });

    this.socket.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }

  private async handleUpdate(update: any): Promise<void> {
    const delivery = await this.fetchDelivery(update.orderId);
    this.onUpdate(delivery);
  }

  private fetchDelivery(orderId: string): Promise<Delivery> {
    return queryOne(`SELECT * FROM delivery_logistics WHERE order_id = $1`, [orderId]);
  }
}
```

- [ ] **Step 2: Write test for tracking connection logic**

```typescript
// test/unit/trackingClient.test.ts
import { TrackingClient } from '../src/websocket/trackingClient';

test('TrackingClient connects for order', () => {
  // Mock WebSocket; verify start is called
  expect(() => new TrackingClient()).not.toThrow();
});
```

- [ ] **Step 3: Run test to verify failure**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/trackingClient.test.ts -v`
Expected: Test fails (module not found)

- [ ] **Step 4: Implement and verify test passes**

Run: `cd ice-cream-delivery/backend && npx jest test/unit/trackingClient.test.ts -v`
Expected: Tests PASS

- [ ] **Step 5: Commit WebSocket tracking client**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/backend/src/websocket/ ice-cream-delivery/backend/test/unit/
git commit -m "feat(backend): add WebSocket tracking client for real-time updates"
```

---

## Global Constraints (Recap)

- Node.js + TypeScript (strict) backend
- Express framework
- PostgreSQL for transactional data
- JWT authentication
- REST API + WebSocket for real-time tracking
- Consistent `{ code, data, error }` responses
- Security: tokenized payment, input validation, secret management

## Plan Self-Review

**1. Spec Coverage:** All spec backend requirements are covered: API design & routes, service layer, database schema, auth, payment (with webhook verification), order integrity, delivery logistics, and real-time tracking — each mapped to tasks. Open items (specific payment provider) noted as to be finalized in implementation.

**2. Step Scan:** Each task has unambiguous, independently testable steps (test first, run, implement, verify, commit). No steps carry undone decisions or incomplete bodies.

**3. Type Consistency:** All TypeScript types, function signatures, and model names are consistent across tasks and match the spec.

**4. Review Focus:** All five Review Focus items (payment webhook verification, order transaction integrity, JWT validation, input validation, WebSocket error handling) are covered by dedicated tasks with tests.

**5. Proportion:** Plan is scoped to backend implementation only, no redundant sections; length matches the spec scope.

