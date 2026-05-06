import { Request, Response, NextFunction } from 'express';
import User from '../modules/users/users.model.js';
import { TokenService } from '../services/token.service.js';
import catchAsync from '../utils/catchAsync.js';

export const protect = catchAsync(async (req: any, res: Response, next: NextFunction) => {
  let token;
  const service = new TokenService();

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const decoded: any = service.verifyAccessToken(token);

  const user = await User.findById(decoded.id);

  if (!user) {
    return res.status(401).json({ message: 'User no longer exists' });
  }

  req.user = user;
  return next();
});

type Role = 'super_admin' | 'admin' | 'user' | 'employee' | 'hr' | 'manager';

export const restrictTo = (...roles: Role[]) => {
  return (req: Request & { user?: { role?: Role } }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role!)) {
      return res.status(403).json({
        status: "Non autorisée!",
        message: "Vous n'avez pas la permission d'effectuer cette action!"
      });
    }
    return next();
  };
};