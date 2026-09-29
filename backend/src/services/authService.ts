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
    if (!payload || typeof payload !== 'object' || !payload.id || !payload.email) {
      return null;
    }
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'user'
    };
  } catch {
    return null;
  }
}

export function authRoutes(_req: any, res: any, next: any) {
  next();
}

export { AppError, ERROR_CODES };
