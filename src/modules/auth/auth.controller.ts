// modules/auth/auth.controller.ts

import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import catchAsync from '../../utils/catchAsync.js';

const authService = new AuthService();

export const signup = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);

  res.status(201).json({
    status: 'success',
    data: result
  });
});

export const saveUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.saveUser(req.body, res);

  res.status(201).json({
    status: 'success',
    data: result
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
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

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const cookies = req.cookies;

  // Check if cookies are present
  if (!cookies || !cookies.refresh_jwt) {
    return res.status(401).json({ status: 'Echec', message: 'Aucun token de rafraîchissement fourni' });
  }

  // Extract the refresh token from cookies
  const refreshToken = cookies.refresh_jwt;

  const result = await authService.refresh(refreshToken);

  const { access_token, user } = result;

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

  return res.json({
    status: 'success',
    data: {
      access_token,
      user
    }
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.cookies.refresh_jwt);

  res.clearCookie('access_jwt');
  res.clearCookie('refresh_jwt');

  res.status(204).send();
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);

  res.json(result);
});

export const resetPassword = catchAsync(async (req: Request | any, res: Response) => {
  const { token } = req.params;
  const { newPassword, passwordConfirm } = req.body;
  const result = await authService.resetPassword(token, newPassword, passwordConfirm);
  res.json(result);
});