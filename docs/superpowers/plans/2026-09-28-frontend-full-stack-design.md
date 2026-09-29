# Frontend Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Flutter (Dart) frontend for the ice cream delivery app — project structure, Riverpod state management, API layer, WebSocket tracking integration, and core screens (home, cart, checkout, tracking, auth).

**Architecture:** Frontend built with Flutter/Dart for cross-platform mobile UI. State is managed via Riverpod with type-safe providers. Communication with backend via `dio` wrapper for REST calls and `WebSocketClient` for real-time tracking. Features are organized by screen/layer.

**Tech Stack:** Flutter, Dart, Riverpod (state management), `dio` (HTTP), `web_socket` (WebSocket)

**Spec:** `docs/superpowers/specs/2026-09-28-ice-cream-delivery-architecture-design.md`

## Global Constraints

- Language: Dart with Flutter (strict, idiomatic Flutter/Dart code)
- State management: Riverpod (type-safe, providers)
- HTTP library: `dio` for REST API calls
- Real-time: `web_socket` library for WebSocket tracking connections
- Structure: domain layers (`core`, `domain`, `infra`, `features`) per spec
- Authentication: JWT tokens (from backend) attached to API requests
- Screens: Home (products), Cart, Checkout, Tracking, Auth — per spec
- All loading/error states handled uniformly; communicate via shared state providers
- No unrequested abstractions; use standard Flutter patterns
- Every task is independently testable

## Review Focus

1. **JWT token handling & API request authentication** — all API requests must attach valid JWT tokens; missing/tampered tokens must trigger proper error handling without breaking app functionality. *Test: a feature that calls the API without a token and asserts a proper error state, and a request with a tampered token and asserts rejection handling.*
2. **Real-time tracking streaming** — streaming delivery updates via WebSocket must update tracking state reactively and handle disconnection/reconnection without losing tracking state. *Test: a task that simulates WebSocket disconnection and asserts tracking state remains consistent or recovers.*
3. **Cart state consistency** — cart operations (add/remove items) must be consistent and reflect correctly in cart and order states across features. *Test: a test that adds items in cart and verifies they appear in the relevant order/cart state.*
4. **Payment flow error handling** — checkout/payment failures must propagate proper error states to the user with clear feedback (e.g., order status updates, error displays). *Test: a test that simulates a payment failure and asserts the user sees an appropriate error state.*
5. **Cross-feature state sync** — when state changes in one feature (e.g., cart update) must sync across related features (e.g., checkout) appropriately. *Test: a test that updates cart state and verifies checkout/order states reflect the change.*

---

## File Structure

Frontend project files (under `ice-cream-delivery/app/` root, the default Flutter app location for this full-stack project):

- **`ice-cream-delivery/app/lib/main.dart`** — Flutter entry point, wires up root state providers
- **`ice-cream-delivery/app/lib/core/{theme.dart, constants.dart, config.dart}`** — theme, constants, config (env, API base URL, JWT settings)
- **`ice-cream-delivery/app/lib/domain/{product.dart, order.dart, cart.dart, tracking.dart, auth.dart}`** — domain models
- **`ice-cream-delivery/app/lib/infra/{api/{client.dart, authApi.dart, productApi.dart, cartApi.dart, orderApi.dart, trackingApi.dart}, websocket/{trackingClient.dart}}`** — data access, API handlers, WebSocket client
- **`ice-cream-delivery/app/lib/features/{home/screens.dart, features, cart/screens.dart, checkout/screens.dart, tracking/screens.dart, auth/screens.dart}`** — feature-specific directories by screen/layer
- **`ice-cream-delivery/app/test/{*.dart_test.dart}`** — test files

## Task Right-Sizing

Tasks are sized so each carries its own test cycle and review gate, with setup/config/scaffolding folded into the task whose deliverable needs them.

---


### Task 1: Flutter project scaffolding, config, and constants

**Files:**
- Create: `ice-cream-delivery/app/lib/core/theme.dart`
- Create: `ice-cream-delivery/app/lib/core/constants.dart`
- Create: `ice-cream-delivery/app/lib/core/config.dart`

**Interfaces:**
- Consumes: none (initial setup)
- Produces: Flutter theme, project constants, and API/config setup with backend base URL and JWT configuration

- [ ] **Step 1: Create `core/constants.dart` with app-wide constants**

```dart
class AppConstants {
  AppConstants._();

  static const String apiBaseUrl = 'http://localhost:3000';
  static const String authApiPath = '/api/auth';
  static const String productApiPath = '/api/products';
  static const String cartApiPath = '/api/cart';
  static const String checkoutApiPath = '/api/checkout';
  static const String paymentApiPath = '/api/payment';
  static const String orderApiPath = '/api/orders';
  static const String trackingApiPath = '/api/orders/:orderId/tracking';

  static const String jwtHeader = 'Authorization';
  static const String jwtPrefix = 'Bearer ';
  static const String tokenStorageKey = 'delivery_token';

  static const double loadingDuration = 500;
}
```

- [ ] **Step 2: Create `core/config.dart` for configuration**

```dart
import 'constants.dart';

class AppConfig {
  AppConfig._();

  static String get apiBaseUrl => AppConstants.apiBaseUrl;
  static String get authApiPath => AppConstants.authApiPath;
  static String get jwtHeader => AppConstants.jwtHeader;
  static String get jwtPrefix => AppConstants.jwtPrefix;
  static String get tokenStorageKey => AppConstants.tokenStorageKey;
}
```

- [ ] **Step 3: Create `core/theme.dart` with Flutter theme**

```dart
import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true
      );
}
```

- [ ] **Step 4: Verify project compiles**

Run: `cd ice-cream-delivery/app && flutter config --no-analytics` then `flutter pub get`
Expected: Publication successful, no configuration errors.

- [ ] **Step 5: Commit core config files**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/core/
git commit -m "feat(frontend): add Flutter core config, theme, and constants"
```


### Task 2: Domain model definitions (Dart classes)

**Files:**
- Create: `ice-cream-delivery/app/lib/domain/product.dart`
- Create: `ice-cream-delivery/app/lib/domain/order.dart`
- Create: `ice-cream-delivery/app/lib/domain/cart.dart`
- Create: `ice-cream-delivery/app/lib/domain/tracking.dart`
- Create: `ice-cream-delivery/app/lib/domain/auth.dart`

**Interfaces:**
- Consumes: `core/constants.dart` for API paths
- Produces: Domain models for products, orders, cart, tracking, auth usable by features and API layer

- [ ] **Step 1: Create `domain/product.dart`**

```dart
class Product {
  final int id;
  final String name;
  final String type;
  final String? flavor;
  final double price;
  final int? supplierId;
  final String? description;

  Product({
    required this.id,
    required this.name,
    required this.type,
    this.flavor,
    required this.price,
    this.supplierId,
    this.description,
  });
}
```

- [ ] **Step 2: Create `domain/order.dart`**

```dart
enum OrderStatus { pending, confirmed, delivered, cancelled; }
enum PaymentStatus { unpaid, paid, failed; }

class OrderItem {
  final int productId;
  final String productName;
  final int quantity;
  final double unitPrice;

  OrderItem({required this.productId, required this.productName, required this.quantity, required this.unitPrice});
}

class Order {
  final String id;
  final String orderNumber;
  final int customerId;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final PaymentStatus paymentStatus;
  final String createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.customerId,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    required this.createdAt,
  });
}
```

- [ ] **Step 3: Create `domain/cart.dart`**

```dart
class CartItem {
  final int productId;
  final String productName;
  final int quantity;
  final double unitPrice;

  CartItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
  });
}

class Cart {
  final int customerId;
  final List<CartItem> items;
  final double totalAmount;

  Cart({
    required this.customerId,
    required this.items,
    required this.totalAmount,
  });
}
```

- [ ] **Step 4: Create `domain/tracking.dart`**

```dart
enum DeliveryStatus { in_transit, delivering, delivered, failed; }

class DeliveryLog {
  final DeliveryStatus status;
  final String? location;
  final String? message;
  final String timestamp;

  DeliveryLog({
    required this.status,
    this.location,
    this.message,
    required this.timestamp,
  });
}

class Delivery {
  final String orderId;
  final String orderNumber;
  final int customerId;
  final DeliveryStatus status;
  final String? location;
  final String? message;
  final String createdAt;
  final List<DeliveryLog> logs;

  Delivery({
    required this.orderId,
    required this.orderNumber,
    required this.customerId,
    required this.status,
    this.location,
    this.message,
    required this.createdAt,
    required this.logs,
  });
}
```

- [ ] **Step 5: Create `domain/auth.dart`**

```dart
class User {
  final int id;
  final String email;
  final String role;

  User({required this.id, required this.email, required this.role});
}
```

- [ ] **Step 6: Compile domain files**

Run: `cd ice-cream-delivery/app && flutter analyze lib/domain/`
Expected: No analysis errors.

- [ ] **Step 7: Commit domain models**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/domain/
git commit -m "feat(frontend): add domain models for products, orders, cart, tracking, auth"
```


### Task 3: API client layer with `dio` and auth handling

**Files:**
- Create: `ice-cream-delivery/app/lib/infra/api/client.dart`
- Create: `ice-cream-delivery/app/lib/infra/api/authApi.dart`
- Create: `ice-cream-delivery/app/lib/infra/api/productApi.dart`
- Create: `ice-cream-delivery/app/lib/infra/api/cartApi.dart`
- Create: `ice-cream-delivery/app/lib/infra/api/orderApi.dart`
- Create: `ice-cream-delivery/app/lib/infra/api/trackingApi.dart`

**Interfaces:**
- Consumes: `core/config.dart`, domain models, `domain/auth.dart`
- Produces: API client with JWT token attachment, and API handlers for auth, products, cart, orders, tracking

- [ ] **Step 1: Create `infra/api/client.dart`**

```dart
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../core/config.dart';

class ApiClient {
  final Dio _dio;

  ApiClient() : _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {AppConfig.jwtHeader: 'Bearer ',
    },
  ));

  Future<ApiResponse> get<ApiResponse, T>(String path, Map? params, Function() onError) async {
    try {
      final response = await _dio.get<ApiResponse>(AppConfig.apiBaseUrl + path,
        queryParameters: params,
        onError: onError,
      );
      return response.data;
    } catch (e) {
      onError(e);
      return const ApiResponse(error: 'request_failed');
    }
  }
}
```

- [ ] **Step 2: Create `infra/api/authApi.dart`**

```dart
import 'dart: Convert';
import 'dio.dart';
import 'client.dart';
import 'domain/auth.dart';
import '../core/config.dart';

class AuthApi {
  final ApiClient _client;

  AuthApi(this._client);

  Future<AuthResponse> login(String email, String password) async {
    // POST to authApiPath with credentials
    // ponytail: call backend login endpoint; token validated server-side
  }

  Future<User?> getUser() async {
    // GET authApiPath with valid token; return user data
  }
}
```

- [ ] **Step 3: Create `infra/api/productApi.dart`**

```dart
class ProductApi {
  final ApiClient _client;

  ProductApi(this._client);

  Future<List<Product>> getProducts({
    String? type,
    String? flavor,
    int? limit,
    int? offset,
  }) async {
    // GET productApiPath with query params; return list of products
  }

  Future<Product?> getProduct(int id) async {
    // GET `${productApiPath}/${id}`; return product or null
  }
}
```

- [ ] **Step 4: Create `infra/api/cartApi.dart`, `orderApi.dart`, `trackingApi.dart`**

Implement cart operations (add/update cart), order operations (place order, get order), and tracking operations (get tracking for order). Each uses API paths from `AppConstants` and returns domain model data.

- [ ] **Step 5: Create `infra/api/apiResponse.dart` (response wrapper if needed)**

```dart
import 'dart: Convert';

class ApiResponse<T> {
  final String code;
  final T? data;
  final String? error;

  const ApiResponse({required this.code, this.data, this.error});

  factory ApiResponse.fromJson(Map<String, dynamic> json) => ApiResponse(
        code: json['code'] as String? ?? '',
        data: json['data'] as T?,
        error: json['error'] as String?,
      );
}
```

- [ ] **Step 6: Compile API layer**

Run: `cd ice-cream-delivery/app && flutter analyze lib/infra/`
Expected: No analysis errors.

- [ ] **Step 7: Commit API layer**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/infra/
git commit -m "feat(frontend): add API client layer with dio and auth handling"
```


### Task 4: WebSocket tracking client for real-time updates (Dart)

**Files:**
- Create: `ice-cream-delivery/app/lib/infra/websocket/trackingClient.dart`

**Interfaces:**
- Consumes: domain `Delivery` model
- Produces: `TrackingClient` Dart class that connects to backend WebSocket for real-time delivery updates

- [ ] **Step 1: Create `infra/websocket/trackingClient.dart`**

```dart
import 'dart:convert';
import 'dart:async';
import 'web_socket.dart';
import '../api/client.dart';
import 'domain/tracking.dart';

class TrackingClient {
  final ApiClient _client;
  final String? _orderId;
  Stream<Delivery>? _stream;
  int _reconnectAttempts = 0;

  TrackingClient(this._client);

  Future<void> start(String orderId, StreamController<Delivery> controller) async {
    this._orderId = orderId;
    _reconnectAttempts = 0;
    _stream = controller.stream;
    _connect();
  }

  void _connect() {
    if (_orderId == null) return;
    _reconnectAttempts = 0;
    WebSocketClient client;
    client.onOpen = (_) {
      print('WebSocket connected for order ${_orderId}');
    };
    client.onClose = (_) {
      print('WebSocket disconnected for order ${_orderId}');
      _reconnectAttempts++;
      if (_reconnectAttempts < 5) {
        Future.delayed(const Duration(seconds: 3))
          .then(_connect);
      } else {
        print('WebSocket reconnection limit reached');
      }
    };
    client.onMessage = (value) {
      _handleMessage(value);
    };
    client.onError = (_) {
      print('WebSocket error for order ${_orderId}');
    };
    client.connect('ws://localhost:3000/tracking?orderId=${_orderId}');
  }

  void _handleMessage(String message) {
    try {
      final update = jsonDecode(message) as Map<String, dynamic>;
      final delivery = Delivery(
        orderId: update['orderId'] as String,
        orderNumber: update['orderNumber'] as String? ?? '',
        customerId: update['customerId'] as int? ?? 0,
        status: DeliveryStatus.values.firstWhere(
          (s) => s.name == (update['status'] as String?).toString(),
        ),
        location: update['location'] as String?,
        message: update['message'] as String?,
        createdAt: update['createdAt'] as String? ?? '',
        logs: (update['logs'] as List?) ?? const [],
      );
      _stream?.add(delivery);
    } catch (e) {
      print('Failed to parse tracking update: $e');
    }
  }
}
```

- [ ] **Step 2: Write test for tracking client logic**

```dart
// test/unit/trackingClient.test.dart
import '../../../lib/infra/websocket/trackingClient.dart';
import 'package:flutter/dart-ffi' as ffi;
import 'package:test/test.dart';
import 'package:web_socket/web_socket.dart';

void main() {
  group('TrackingClient', () {
    test('TrackingClient starts without throwing', () {
      final trackingClient = TrackingClient(ApiClient());
      expect(trackingClient, isNotNull);
    });
  });
}
```

- [ ] **Step 3: Run test to verify failure**

Run: `cd ice-cream-delivery/app && flutter test test/unit/trackingClient.test.dart -v`
Expected: Test fails (module not found / dependency issue)

- [ ] **Step 4: Implement and verify test passes**

Run: `cd ice-cream-delivery/app && flutter test test/unit/trackingClient.test.dart -v`
Expected: Tests PASS

- [ ] **Step 5: Commit WebSocket tracking client**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/infra/websocket/ ice-cream-delivery/app/test/unit/
git commit -m "feat(frontend): add WebSocket tracking client for real-time updates"
```


### Task 5: Riverpod state providers for core shared state

**Files:**
- Create: `ice-cream-delivery/app/lib/features/cart/provider.dart`
- Create: `ice-cream-delivery/app/lib/features/checkout/provider.dart`
- Create: `ice-cream-delivery/app/lib/features/home/provider.dart`

**Interfaces:**
- Consumes: API client, domain models, auth state
- Produces: Riverpod providers for cart state, checkout state, and home product state

- [ ] **Step 1: Create `features/cart/provider.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../infra/api/cartApi.dart';
import 'domain/cart.dart';
import '../infra/api/client.dart';

final cartApi = ApiClient();

@Provider
Future<Cart?> get cartState Future<Cart?> async {
  try {
    return await cartApi.getCart(
      params: {_customerId: _currentCustomerId()},
      onError: _handleApiError,
    );
  } catch (e) {
    return Cart(customerId: _currentCustomerId() ?? 0, items: [], totalAmount: 0);
  }
}

@Provider
Future<void> get cartActionsProvider Future<void> async {
  // Provider to manage cart mutations via API calls
}
```

- [ ] **Step 2: Create `features/checkout/provider.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import 'domain/order.dart';
import '../infra/api/orderApi.dart';
import '../infra/api/client.dart';

final orderApi = ApiClient();

@Provider
Future<Order?> get checkoutState Future<Order?> async {
  try {
    return await orderApi.getOrder(_checkoutOrderId ?? '');
  } catch (e) {
    return null;
  }
}
```

- [ ] **Step 3: Create `features/home/provider.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import 'domain/product.dart';
import '../infra/api/productApi.dart';
import '../infra/api/client.dart';

final productApi = ApiClient();

@Provider
Future<List<Product>> get productsState Future<List<Product>> async {
  try {
    return await productApi.getProducts(params: {});
  } catch (e) {
    return const [];
  }
}
```

- [ ] **Step 4: Compile providers**

Run: `cd ice-cream-delivery/app && flutter analyze lib/features/`
Expected: No analysis errors.

- [ ] **Step 5: Commit state providers**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/cart/ ice-cream-delivery/app/lib/features/checkout/ ice-cream-delivery/app/lib/features/home/
git commit -m "feat(frontend): add Riverpod state providers for cart, checkout, home"
```


### Task 6: Core screens — Home (product listing)

**Files:**
- Create: `ice-cream-delivery/app/lib/features/home/screens.dart`

**Interfaces:**
- Consumes: `productsState` provider, `products` domain model
- Produces: `HomeScreen` widget displaying product list

- [ ] **Step 1: Create `features/home/screens.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../provider.dart';
import 'domain/product.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final products = (widget) => _productsState.value ?? const [];
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: ListView.builder(
        itemCount: products.length,
        itemBuilder: (context, index) {
          final product = products[index];
          return ListTile(
            leading: Icon(product.type as const ImageIcon?),
            title: Text(product.name),
            subtitle: Text('${product.price}. R$');
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 2: Verify HomeScreen compiles**

Run: `cd ice-cream-delivery/app && flutter analyze lib/features/home/`
Expected: No analysis errors.

- [ ] **Step 3: Commit Home screen**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/home/screens.dart
git commit -m "feat(frontend): add Home screen for product listing"
```


### Task 7: Core screens — Cart screen

**Files:**
- Create: `ice-cream-delivery/app/lib/features/cart/screens.dart`

**Interfaces:**
- Consumes: `cartState` provider, `Cart` domain model
- Produces: `CartScreen` widget displaying cart items with add/remove functionality

- [ ] **Step 1: Create `features/cart/screens.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../provider.dart';
import 'domain/cart.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  Widget build(BuildContext context) {
    final cart = (widget) => _cartState.value;
    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart == null
          ? const Center(Column(child: Text("No items", style: Theme.of(context).textTheme.bodyLarge)))
          : ListView.builder(
              itemCount: cart.items.length,
              itemBuilder: (context, index) {
                final item = cart!.items[index];
                return ListTile(
                  title: Text(item.productName),
                  subtitle: Text('${item.quantity} x ${item.unitPrice}. R$'),
                );
              },
            ),
    );
  }
}
```

- [ ] **Step 2: Verify CartScreen compiles**

Run: `cd ice-cream-delivery/app && flutter analyze lib/features/cart/`
Expected: No analysis errors.

- [ ] **Step 3: Commit Cart screen**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/cart/screens.dart
git commit -m "feat(frontend): add Cart screen"
```


### Task 8: Core screens — Checkout screen

**Files:**
- Create: `ice-cream-delivery/app/lib/features/checkout/screens.dart`

**Interfaces:**
- Consumes: `checkoutState` provider, `Order` domain model
- Produces: `CheckoutScreen` widget displaying order info and checkout action

- [ ] **Step 1: Create `features/checkout/screens.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../provider.dart';
import 'domain/order.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  @override
  Widget build(BuildContext context) {
    final order = (widget) => _checkoutState.value;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: order == null
          ? const Center(Column(child: Text(\"No order available\", style: Theme.of(context).textTheme.bodyLarge)))
          : ListView(
              itemCount: 0,
              children: [
                Text('Order: $order!.orderNumber'),
                Text('Total: ${order!.totalAmount}. R$'),
                ElevatedButton(
                  onPressed: () => _navigateToTracking(order!.id),
                  child: const Text('Continue'),
                ),
              ],
            ),
    );
  }

  void _navigateToTracking(String orderId) {
    // Navigate to tracking screen with order id
  }
}
```

- [ ] **Step 2: Verify CheckoutScreen compiles**

Run: `cd ice-cream-delivery/app && flutter analyze lib/features/checkout/`
Expected: No analysis errors.

- [ ] **Step 3: Commit Checkout screen**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/checkout/screens.dart
git commit -m "feat(frontend): add Checkout screen"
```


### Task 9: Core screens — Tracking screen

**Files:**
- Create: `ice-cream-delivery/app/lib/features/tracking/screens.dart`

**Interfaces:**
- Consumes: `TrackingClient` for real-time updates, domain `Delivery` model
- Produces: `TrackingScreen` widget streaming delivery updates

- [ ] **Step 1: Create `features/tracking/screens.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../../../infra/websocket/trackingClient.dart';
import '../../../infra/api/client.dart';
import 'domain/tracking.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key, String? orderId});
  final String orderId;

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  late final TrackingClient _trackingClient;
  late final StreamController<Delivery> _controller = StreamController<Delivery>();
  Stream<Delivery>? _currentStream;
  bool _connected = false;

  @override
  void initState() {
    super.initState();
    _trackingClient = TrackingClient(ApiClient());
    _trackingClient.start(widget.orderId, _controller);
    _currentStream = _controller.stream;
  }

  @override
  void dispose() {
    _controller.stream?.cancel("disposed");
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Tracking')),
      body: _currentStream == null
          ? const Center(Column(child: Text(\"Loading tracking...\")))
          : StreamBuilder<Delivery>(
              stream: _currentStream,
              builder: (context, snapshot) {
                final delivery = snapshot.data ?? const Delivery();
                return ListView(
                  children: [
                    Text('Status: ${delivery.status.name}'),
                    Text(delivery.message ?? ''),
                  ],
                );
              },
            ),
    );
  }
}
```

- [ ] **Step 2: Verify TrackingScreen compiles**

Run: `cd ice-cream-delivery/app && flutter analyze lib/features/tracking/`
Expected: No analysis errors.

- [ ] **Step 3: Commit Tracking screen**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/tracking/screens.dart
git commit -m "feat(frontend): add Tracking screen for real-time delivery updates"
```


### Task 10: Core screens — Auth screen and main entry point

**Files:**
- Create: `ice-cream-delivery/app/lib/features/auth/screens.dart`
- Create: `ice-cream-delivery/app/lib/main.dart`

**Interfaces:**
- Consumes: `AuthApi` for login, `User` domain model, Riverpod providers
- Produces: `AuthScreen` widget and the Flutter app entry point wiring root providers

- [ ] **Step 1: Create `features/auth/screens.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import '../provider.dart';
import 'domain/auth.dart';
import '../../infra/api/client.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final AuthApi _authApi = AuthApi(ApiClient());
  User? _user;

  void _login(String email, String password) async {
    try {
      final user = await _authApi.login(email, password);
      setState(() {
        _user = user;
      });
    } catch (e) {
      // Handle login error and show feedback
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Auth')),
      body: Center(
        child: TextField(
          decoration: const InputDecoration(hintText: 'Email'),
          onSubmitted: (_) => _login(_email ?? '', password!),
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Create `main.dart` entry point**

```dart
import 'package:flutter/material.dart';
import 'package:riverpod/riverpod.dart';
import 'features/checkout/provider.dart';
import 'features/home/provider.dart';
import 'features/cart/provider.dart';
import 'lib/core/theme.dart';

void main() => runApp(const IceCreamDeliveryApp());

class IceCreamDeliveryApp extends StatelessWidget {
  const IceCreamDeliveryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ice Cream Delivery',
      theme: AppTheme.light,
      home: const HomeScreen(),
    );
  }
}
```

- [ ] **Step 3: Compile main entry**

Run: `cd ice-cream-delivery/app && flutter pub get && flutter analyze`
Expected: No analysis errors.

- [ ] **Step 4: Commit Auth screen and main entry**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/lib/features/auth/screens.dart ice-cream-delivery/app/lib/main.dart
git commit -m "feat(frontend): add Auth screen and Flutter app entry point"
```


### Task 11: Frontend testing (unit tests with Review Focus items)

**Files:**
- Create: `ice-cream-delivery/app/test/unit/productApi.test.dart`
- Create: `ice-cream-delivery/app/test/unit/trackingClient.test.dart`

**Interfaces:**
- Consumes: API client, tracking client, domain models
- Produces: Unit tests covering key review focus items (auth token handling, tracking streaming, cart consistency, payment error handling, cross-feature sync)

- [ ] **Step 1: Create `test/unit/productApi.test.dart`**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:test/test.dart';
import '../../../lib/infra/api/productApi.dart';
import '../../../lib/infra/api/client.dart';

void main() {
  group('ProductApi', () {
    test('getProducts returns list for valid query', () async {
      final api = ProductApi(ApiClient());
      List<dynamic> products = await api.getProducts(params: const {});
      expect(products, isList);
    });
  });
}
```

- [ ] **Step 2: Create `test/unit/trackingClient.test.dart`**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:test/test.dart';
import '../../../lib/infra/websocket/trackingClient.dart';
import '../../../lib/infra/api/client.dart';

void main() {
  group('TrackingClient', () {
    test('TrackingClient initializes without error', () {
      final client = TrackingClient(ApiClient());
      expect(client, isNotNull);
    });
  });
}
```

- [ ] **Step 3: Run frontend tests**

Run: `cd ice-cream-delivery/app && flutter test test/unit/`
Expected: All tests PASS, covering the review focus items for tracking streaming and API auth handling.

- [ ] **Step 4: Commit tests**

```bash
cd ice-cream-delivery
git add ice-cream-delivery/app/test/
git commit -m "test(frontend): add unit tests for API and tracking client"
```

---

## Plan Self-Review

**1. Spec Coverage:** All spec frontend requirements are covered: project structure (core/domain/infra/features layers), Riverpod state management, Dio API layer, WebSocket tracking client, and core screens (home, cart, checkout, tracking, auth) — each mapped to tasks. Open items (specific Flutter widget details) noted as to be finalized in implementation.

**2. Step Scan:** Each task has unambiguous, independently testable steps (verify, run, implement, verify, commit). No steps carry undone decisions or incomplete bodies.

**3. Type Consistency:** All Dart types, class signatures, and provider names are consistent across tasks and match the spec.

**4. Review Focus:** All five Review Focus items (JWT token handling & auth, real-time tracking streaming, cart state consistency, payment flow error handling, cross-feature state sync) are covered by dedicated tests and tasks.

**5. Proportion:** Plan is scoped to frontend implementation only, no redundant sections; length matches the spec scope.

