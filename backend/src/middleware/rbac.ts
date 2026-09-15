import { Response, NextFunction } from 'express';
import { UserRole } from 'shared';
import { AuthRequest } from './auth';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `403 Forbidden: Access denied. Required role: [${allowedRoles.join(', ')}], your role: ${req.user.role}`
      });
    }

    next();
  };
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const isAdminRole = req.user.role === UserRole.ADMIN || (req.user.role as string) === 'ADMIN';

  if (!isAdminRole) {
    return res.status(403).json({
      success: false,
      message: '403 Forbidden: Access denied. Admin role required.'
    });
  }

  next();
};
