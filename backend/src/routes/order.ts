import { Router, Request, Response, NextFunction } from 'express';
import { placeOrder, getOrder } from '../services/orderService';
import { trackingServer } from '../websocket/trackingServer';
import { ApiResponse, AppError, ERROR_CODES } from '../types/error';

const router = Router();

router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, items, totalAmount } = req.body;
    if (!customerId || !items || !totalAmount) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'customerId, items, and totalAmount are required');
    }
    const order = await placeOrder({
      customerId: Number(customerId),
      items,
      totalAmount: Number(totalAmount)
    });

    const response: ApiResponse = {
      code: 'SUCCESS',
      data: order,
      error: null
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const order = await getOrder(orderId);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: order,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId/tracking', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    let tracking = trackingServer.getTracking(orderId);
    if (!tracking) {
      const order = await getOrder(orderId);
      tracking = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        status: 'in_transit',
        location: 'Preparing order at store',
        message: 'Order confirmed and being prepared',
        createdAt: order.createdAt,
        logs: [
          {
            status: 'in_transit',
            location: 'Preparing order at store',
            message: 'Order confirmed and being prepared',
            timestamp: new Date().toISOString()
          }
        ]
      };
      trackingServer.setInitialTracking(tracking);
    }

    const response: ApiResponse = {
      code: 'SUCCESS',
      data: tracking,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
