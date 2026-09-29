import { Router, Request, Response, NextFunction } from 'express';
import { listProducts, getProduct } from '../services/productService';
import { ApiResponse } from '../types/error';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, flavor, limit, offset } = req.query;
    const products = await listProducts({
      type: type as string,
      flavor: flavor as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined
    });

    const response: ApiResponse = {
      code: 'SUCCESS',
      data: products,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const product = await getProduct(id);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: product,
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
