// modules/auth/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import catchAsync from '../../utils/catchAsync.js';

const authService = new AuthService();

export const signup = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const result = await authService.signup(req.body);

  res.status(201).json({
    status: 'success',
    data: result
  });
});

export const saveUser = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const result = await authService.saveUser(req.body, res);

  res.status(201).json({
    status: 'success',
    data: result
  });
});

export const login = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const result = await authService.login(
    req.body.email,
    req.body.password
  );

  const cookieOptions = (exp: string) => {
    return {
      expiresIn: exp,
      httpOnly: true
    }
  }

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'None'
  }

  res.cookie('access_jwt', result.access_token, cookieOptions('120m'));
  res.cookie('refresh_jwt', result.refresh_token,  cookieOptions('2d'));

  res.status(200).json({
    status: 'success',
    data: result
  });
});

export const refresh = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const cookies = req.cookies;

  // Guard Clause: Verify refresh cookie presence
  if (!cookies || !cookies.refresh_jwt) {
    return res.status(401).json({ 
      status: 'Echec', 
      message: 'Aucun token de rafraîchissement fourni' 
    });
  }

  // Extract the refresh token from cookies
  const refreshToken = cookies.refresh_jwt;

  const result = await authService.refresh(refreshToken);
  const { access_token, user } = result;

  // Build Cookie Options cleanly as an Object
  // 120 minutes = 120 * 60 * 1000 milliseconds = 7,200,000ms
  const cookieOptions: any = {
    maxAge: 120 * 60 * 1000,
    httpOnly: true,
    path: '/'
  }

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'none'
  }

  res.cookie('access_jwt', access_token, cookieOptions);

  return res.status(200).json({
    status: 'success',
    data: {
      access_token,
      user
    }
  });
});

export const logout = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  await authService.logout(req.cookies.refresh_jwt);

  res.clearCookie('access_jwt');
  res.clearCookie('refresh_jwt');

  res.status(204).send();
});

export const forgotPassword = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
  const result = await authService.forgotPassword(req.body);

  res.json(result);
});

export const resetPassword = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
  const { token } = req.params;
  const { newPassword, passwordConfirm } = req.body;
  const result = await authService.resetPassword(token, newPassword, passwordConfirm);
  res.json(result);
});