import crypto from 'crypto';

export class CryptoService {
    private readonly secret: string;

  constructor() {
    this.secret = process.env.REFRESH_TOKEN_PEPPER || 'your-super-secret-pepper';
  }

  /**
   * Deterministic hash for refresh tokens.
   * Always returns the same hash for the same input.
  */
  hash(token: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(token)
      .digest('hex');
  }

  generateRandomToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}