import { Router, Request, Response, NextFunction } from 'express';
import { signToken, validateToken } from '../services/authService';
import { ApiResponse, AppError, ERROR_CODES } from '../types/error';

const router = Router();

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Email and password are required');
    }
    // Simple mock auth for development/spec validation
    const user = { id: 1, email, role: 'user' };
    const token = signToken(user);
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: { token, user },
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/validate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];
    const user = validateToken(token);
    if (!user) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Token is invalid or expired');
    }
    const response: ApiResponse = {
      code: 'SUCCESS',
      data: { user },
      error: null
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
