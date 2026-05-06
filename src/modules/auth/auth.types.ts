// modules/auth/auth.types.ts

export interface SignupDTO {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}