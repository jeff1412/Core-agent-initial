'use strict';

/**
 * modules/authMiddleware.ts — Session cookie auth for API routes
 */

import { Request, Response, NextFunction } from 'express';
import { getSessionUser } from './authStore';

const PUBLIC_API_PATHS = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
]);

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }
  if (PUBLIC_API_PATHS.has(req.path)) {
    next();
    return;
  }

  const token = req.cookies?.asc_session as string | undefined;
  const user = getSessionUser(token);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  (req as any).user = user;
  next();
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production'
};
