# Ice Cream Delivery App — Full-Stack Architecture Design

**Date:** 2026-09-28
**Tech Stack:** Flutter (Dart) frontend + Node.js (TypeScript) backend
**Scope:** Full-stack mobile delivery application for ice cream orders in a city
**User Context:** Users order ice cream products and receive takeaway delivery within the target city

---

## 1. Overview

This document defines the complete architecture for a full-stack mobile ice cream delivery application. The app enables city users to order ice cream products, place orders, complete payments, and track live delivery in real time.

**Success Criteria:**
- Mobile app (Android & iOS) built with Flutter/Dart
- Full-stack backend with custom API for order, payment, product, and delivery processing
- Real-time live delivery tracking
- Production-grade security, transactional integrity, and payment reliability
- Tested end-to-end user journeys

**Key Context (Assumptions):**
- Ice cream is perishable and time-sensitive → delivery reliability and perishability handling are core concerns
- City-specific suppliers and delivery routes must be handled locally
- Transactional integrity is critical (orders, payments)

---

## 2. High-Level Architecture

### 2.1 Frontend — Flutter (Dart)
- **Platform:** Cross-platform mobile UI for Android & iOS
- **Core Screens:** Home & ice cream products, cart, checkout/payment, live delivery tracking, auth (login)
- **State Management:** Riverpod (type-safe, modern)
- **API Layer:** `dio` wrapper for async HTTP calls; WebSocket client for real-time tracking
- Purpose: Provide polished mobile user experience, manage app state, communicate with backend

### 2.2 Backend — Node.js + TypeScript
- **Runtime:** Node.js (fast async I/O for I/O-heavy API workloads)
- **Language:** TypeScript (type safety across frontend/backend boundaries)
- **Framework:** Node.js + Express
- **Core Services:** Auth (JWT), products & suppliers, cart & orders, payment, delivery logistics, API routes
- **Database:** PostgreSQL (relational, transactional — essential for order & payment integrity)
- **Real-time Communication:** WebSocket/SSE for live delivery updates
- Purpose: Own all core business logic, handle orders, payments, delivery, and provide API for frontend

### 2.3 Communication & Integration
- **Frontend ↔ Backend:** REST JSON API (dio wrapper in Dart) for standard requests
- **Real-time tracking:** WebSocket/SSE for live delivery progress updates
- **Identity:** JWT tokens (frontend attaches token to API calls; backend validates)
- **Payment:** Transactional webhooks from payment provider confirmations

### 2.4 Security & Integrity
- Payment: tokenized handling on backend (no raw card data processed/stored — PCI-oriented)
- All endpoints: input validation at trust boundaries
- Order integrity: transactional, atomic order creation
- Perishability: order/SLA handling for time-sensitive ice cream
- Secrets: managed via environment variables / secret manager

---

## 3. Backend API Design & Service Structure

### 3.1 API Layer (Node.js + TypeScript + Express)
RESTful JSON API for all frontend requests. Routes by domain:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth` | Authentication (token issuance) |
| GET  | `/api/products` | Ice cream catalog (filters: flavor, type) |
| GET  | `/api/products/:id` | Product details |
| POST | `/api/cart` | Add to cart / update cart |
| POST | `/api/checkout` | Create order, start payment |
| POST | `/api/payment/webhooks` | Payment transaction confirmations |
| GET  | `/api/orders/:orderId` | Order status & details |
| GET  | `/api/orders/:orderId/tracking` | Live delivery tracking |

**Standard Response Format:** `{ code, data, error }`
- Consistent error codes across all responses (e.g., `ORDER_NOT_FOUND`, `PAYMENT_FAILED`)

### 3.2 Service Layer (Domain-Related, Separated)
Services decouple routes from business logic:
- `authService`, `productService`, `orderService`, `paymentService`, `deliveryService`
- Each service owns its business rules, state, and data access
- Routes are thin handlers that delegate to services (no business logic in routes/controllers)

### 3.3 Error Handling
- Uniform error format with domain-specific error codes
- Global error middleware that formats errors
- Input validation errors returned at route level with field-level messages (input validation at trust boundaries)
- Graceful error propagation: 500 errors logged, frontend receives error codes

### 3.4 Database Schema (PostgreSQL)
Core tables: `users`, `products`, `customers` (cart), `orders`, `order_items`, `delivery_logistics`, `reviews`
- Order integrity: orders stored with transactional data (items, status) for consistency
- Suppliers/products linked locally to reflect city-specific ice cream offerings

---

## 4. Flutter Frontend Structure

### 4.1 Project Structure (Dart)
Organized into clear domain layers:

- **`lib/core`** — theme, constants, config (env, API base URL, JWT settings)
- **`lib/domain`** — domain models (Product, Order, CartItem, OrderStatus, etc.)
- **`lib/infra`** — data access, API handlers, WebSocket client (dio wrapper, tracking stream)
- **`lib/features`** — feature-specific directories by screen/layer:
  - `features/home` — product listing, selection
  - `features/cart` — cart management
  - `features/checkout` — checkout & payment
  - `features/tracking` — live delivery tracking
  - `features/auth` — login/authentication
- **`lib/main.dart`** — entry point, wires up root state providers

### 4.2 State Management (Riverpod)
Type-safe state management across the app:
- Key providers:
  - `currentUserProvider` — auth state (user, token)
  - `productProvider` — ice cream catalog with loading/error states
  - `cartProvider` — cart items, add/remove logic
  - `orderProvider` — order state, status updates
  - `trackingProvider` — delivery tracking data (streamed via WebSocket)
- Provides clean separation so features depend on stable interfaces, not raw state

### 4.3 API Layer (Dart)
- Wrapped via `dio` for async HTTP calls
- API service classes map to backend endpoints from `infra` layer
- Auth token injected into requests; handles refresh on 401 where needed
- Consistent error handling using backend error codes

### 4.4 Real-Time Tracking (WebSocket)
- `WebSocketClient` streams delivery progress updates to `trackingProvider`
- Frontend displays live tracking state reactively as updates arrive
- Handles connection errors/reconnect for tracking reliability

### 4.5 Core Screens
- **Home:** Product catalog (ice cream types, flavors, filters)
- **Cart:** Manage items, quick checkout entry
- **Checkout:** Address, order summary, payment form
- **Tracking:** Live delivery status, location, ETA, step-by-step updates
- **Auth:** Login/register flows

### 4.6 UI & Data Flow
- Responsive layout adapted to target mobile screen sizes (Android & iOS)
- Screens communicate via shared state providers; no direct global mutable state
- Loading/error states handled uniformly across screens

---

## 5. Data Flow & Key Flows

### 5.1 Core Data Flows

**Order Placement Flow**
1. User selects ice cream products in home/cart → `POST /api/cart` updates cart state
2. Checkout → `POST /api/checkout` creates order (transactional, atomic) → frontend shows order created
3. `POST /api/payment/webhooks` confirms payment (backend handles transaction)

**Real-Time Tracking Flow**
1. Order created → backend starts delivery
2. `GET /api/orders/:orderId/tracking` (via WebSocket) streams live updates to `trackingProvider`
3. Frontend reactively updates delivery status, location, ETA in tracking screen
4. WebSocket connection handles updates; reconnect if connection drops

**Payment Confirmation Flow**
1. Payment provider sends webhook → backend `paymentService` verifies transaction
2. Updates order status
3. Returns result to user; payment errors (e.g., `PAYMENT_FAILED`) return appropriate error codes to frontend

### 5.2 State Updates (React-to-State)
- All UI state updates flow through Riverpod providers after data changes
- Frontend reads latest state (order status, tracking updates) reactively without manual refresh
- Errors propagate through consistent error handling to user-visible states

### 5.3 Cross-Layer Integrity
- Frontend depends only on stable interfaces (providers, API service classes) → no coupling to internal backend internals
- Backend services own business logic and data → no logic scattered across routes/controllers

### 5.4 Key Reliability Considerations (Ice Cream Context)
- Orders are transactional so they cannot be inconsistent or partial
- Tracking streams via WebSocket ensure live, accurate delivery status updates
- Payment webhooks ensure transactional, verified confirmations (no unverified orders)

---

## 6. Security & Integrity Details

### 6.1 Security Measures

**Identity & Authentication**
- JWT tokens for user authentication (issued by backend on login)
- Frontend attaches token to all API requests; backend validates and refreshes where needed
- No raw user credentials exposed; tokens handle session
- Input validation at all trust boundaries (all endpoints) with field-level error messages

**Payment Security**
- Backend processes tokenized payment handling (no raw card data stored/processed directly — aligns with PCI compliance best practices)
- Payment webhooks from payment provider validate transaction authenticity
- Payment failures (e.g., `PAYMENT_FAILED`) return domain-specific error codes to frontend
- Orders are transactional until payment is confirmed by a verified webhook

**Data Integrity & Transactions**
- Order creation is atomic (PostgreSQL transactions) — orders cannot be partial/inconsistent
- Perishability handling: orders track SLA, time-sensitive delivery priority for ice cream, alerts if delivery time is at risk
- All state changes (orders, cart, tracking) are validated and consistent

**Secret Management**
- Secrets (DB credentials, payment provider keys, JWT secrets) managed via environment variables / secret manager
- No secrets hardcoded in source code or committed to version control

**Access Control**
- Role-based or scoped access per feature (e.g., cart access limited to owner)
- Backend restricts routes based on authentication state; unauthorized requests return 401 errors

### 6.2 Testing Strategy

**Frontend Testing (Flutter/Dart)**
- Unit tests for domain logic (cart operations, order status transitions, validation rules)
- Widget tests for core screens (home, cart, checkout, tracking) to verify UI behavior and state rendering
- API layer tests for service methods against mocked endpoints
- Tests cover edge cases (e.g., empty cart, invalid payment input, missing auth)

**Backend Testing (Node.js/TypeScript)**
- Unit tests for service logic (order creation, payment processing, tracking status updates)
- Integration tests for API routes against the database (PostgreSQL) to verify data consistency
- Test authentication (token issuance/validation, unauthorized access)
- Test API error handling with consistent error responses

**End-to-End (E2E) Testing**
- E2E tests covering core user journeys: login → product selection → cart → checkout → payment → order tracking
- Verify real-time tracking updates via WebSocket flows
- Validate payment confirmation and order status transitions end-to-end

**Reliability Testing**
- Test WebSocket connection handling (live tracking updates, reconnect on disconnection)
- Test transactional order integrity (no partial orders)
- Test payment failure and error propagation to user

---

## 7. Assumptions & Open Items

**Assumptions:**
- Target mobile screens for Android & iOS with responsive layouts
- Standard payment provider integration (webhook-based confirmations)
- Local PostgreSQL database for data storage in the city environment
- JWT-based authentication for user sessions

**Open Items:**
- Specific payment provider to integrate (API integration details to be finalized)
- Specific ice cream supplier/market list for the target city (to be defined in implementation)
- Detailed API endpoint specifications (to be finalized in implementation planning)
- Exact WebSocket protocol details for real-time tracking (to be defined in implementation)
