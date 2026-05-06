import jwt from 'jsonwebtoken';
import { promisify } from 'util';

export class TokenService {

  generateAccessToken(userId: string) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_ACCESS_SECRET_KEY!,
      // { expiresIn: '15m' }
      { expiresIn: '120m' }
    );
  }

  generateActivationToken(user: any) {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  
    const token = jwt.sign(
      { user, activationCode }, 
      process.env.JWT_ACTIVATION_SECRET!, 
      { expiresIn: '10m' }
    );
  
    return { token, activationCode }
  }

  generateRefreshToken(userId: string) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET_KEY!,
      { expiresIn: '2d' }
      // { expiresIn: '7d' }
    );
  }

  async decodeJwtAndExtractData(data: any, res: any) {
    const { activation_token, activation_code } = data;

    // Decode JWT and extract user and activation code
    const promisifyJwt: any = promisify(jwt.verify);
    const decoded = await promisifyJwt(activation_token, process.env.JWT_ACTIVATION_SECRET!);

    if (decoded.activationCode !== activation_code) {
      // return next(new AppError("Code de vérification invalide.", 400))
      return res.status(400).json({ status: "Echec", message: "Code de vérification invalide." });
    }
  }

  verifyAccessToken(token: string) {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY!);
  }

  verifyRefreshToken(token: string) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET_KEY!);
  }
}