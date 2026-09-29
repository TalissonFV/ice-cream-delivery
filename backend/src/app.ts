import express, { Request, Response, NextFunction } from 'express';
import authRouter from './routes/auth';
import productRouter from './routes/product';
import cartRouter from './routes/cart';
import orderRouter from './routes/order';
import paymentRouter from './routes/payment';
import { ApiResponse, AppError, ERROR_CODES } from './types/error';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  // CORS middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment-Signature');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/products', productRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/payment', paymentRouter);

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
