import { Router, Request, Response, NextFunction } from 'express';
import { getCart, addToCart, updateCart, clearCart } from '../services/cartService';
import { ApiResponse, AppError, ERROR_CODES } from '../types/error';

const router = Router();

router.get('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    const cart = await getCart(customerId);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: cart,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, productId, quantity } = req.body;
    if (!customerId || !productId || !quantity) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'customerId, productId, and quantity are required');
    }
    const item = await addToCart(Number(customerId), Number(productId), Number(quantity));
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: item,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.put('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'items must be an array');
    }
    const updatedCart = await updateCart(customerId, items);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: updatedCart,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.delete('/:customerId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    await clearCart(customerId);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: { message: 'Cart cleared' },
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
