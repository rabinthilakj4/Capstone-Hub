import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from 'shared';
import prisma from '../config/db';

export interface AuthRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    role: UserRole;
    name: string;
    department_id: number | string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'capstone_hub_jwt_super_secret_key_2026_antigravity';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.user_id },
      select: {
        user_id: true,
        email: true,
        role: true,
        name: true,
        department_id: true,
        status: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Invalid or inactive user account.' });
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name,
      department_id: user.department_id
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};
