import { AuthRepository } from './auth.repository.js';
import { CryptoService } from '../../services/crypto.service.js';
import { TokenService } from '../../services/token.service.js';
import { 
  sendResetPasswordEmail, 
  sendVerificationEmail
} from '../../services/email.service.js';
import { BaseService } from '../base/base.service.js';
import { IUser } from '../users/users.model.js';

export class AuthService extends BaseService<IUser | any> {
  constructor(
    private repo = new AuthRepository(),
    private crypto = new CryptoService(),
    private tokenService = new TokenService()   
  ) {
    super(repo);
  }

  async signup(data: any) {
    const existing = await this.repo.findByEmail(data.email, '+password');
    if (existing) throw new Error("L'utilisateur existe déjà");

    const { username, email, password, passwordConfirm } = data;

    const user = { username, email, password, passwordConfirm };

    const activationToken = this.tokenService.generateActivationToken(user);

    const activationCode = activationToken.activationCode;
    const tokens = { activationToken: activationToken.token };

    await sendVerificationEmail(user.email, user.username, activationCode);

    return { user, ...tokens };
  }

  async saveUser(data: any, res: any) { 

    const decoded: any = this.tokenService.decodeJwtAndExtractData(data, res);

    const { username, email, password, passwordConfirm } = decoded.user;

    const checkedUser = await this.repo.findByEmail(email, '+password');
    if (checkedUser) return res.status(400).json({ statut: "Echec", message: "L'email existe déjà!!!" });

    const newUser = await this.repo.createUser({ username, email, password, passwordConfirm }, false);

    return {user: newUser};

  }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email, '+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      throw new Error("Identifiants invalides");
    }

    const tokens = this.generateTokens(user.id);

    // 🔐 hash refresh token before saving
    const hashed = this.crypto.hash(tokens.refreshToken);
    const updatedUser = await this.repo.saveRefreshToken(user._id, hashed);

    const { password: _, ...userWithoutPassword } = updatedUser.toObject();

    return { 
      user: userWithoutPassword, 
      access_token: tokens.accessToken, 
      refresh_token: tokens.refreshToken 
    };
  }

  async refresh(token: string) {
    const decoded: any = this.tokenService.verifyRefreshToken(token);
    
    const hashed = this.crypto.hash(token);
    
    const user = await this.repo.findByRefreshToken(hashed);
    
    if (!user || user._id.toString() !== decoded.id) {
      throw new Error("Token de rafraîchissement invalide");
    }

    const accessToken = this.tokenService.generateAccessToken(user.id);
    // const tokens = this.generateTokens(user.id);

    return { access_token: accessToken, user };
  }

  async logout(refreshToken: string) {
    const hashed = this.crypto.hash(refreshToken);
    const user = await this.repo.findByRefreshToken(hashed);

    if (user) {
      await this.repo.clearRefreshToken(user.id);
    }
  }

  async forgotPassword (data: { email: string, frontendURL: string}){
    const { email, frontendURL } = data;
    
    const user = await this.repo.findByEmail(email, '+password');
    if (!user) throw new Error("Aucun utilisateur trouvé avec cet email");

    // Générer un token de réinitialisation
    const resetToken = this.tokenService.generateAccessToken(user.id);
    const hashedToken = this.crypto.hash(resetToken);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.repo.updateOne(
      { _id: user.id },
      {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000)
      }
    );

    // Send the email to the user
    const appURL = frontendURL || process.env.FRONTEND_URL || 'http://localhost:3000'; // Use frontendURL from request body or environment variable, with a fallback
    const resetURL = `${appURL}/resetPassword/${resetToken}`; // Construct reset URL using frontendURL

    await sendResetPasswordEmail(user.email, user.username, resetURL);

    return {
      status: 'success',
      message: 'Vérifiez votre email, nous vous avons envoyé un token de réinitialisation'
    };
  };

  async resetPassword(token: string, newPassword: string, passwordConfirm: string) {
    const hashedToken = this.crypto.hash(token);
    const user = await this.repo.findByPasswordResetToken(hashedToken);

    if (!user) throw new Error("Utilisateur non trouvé");

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new Error("Le token de réinitialisation a expiré");
    }

    if (newPassword !== passwordConfirm) {
      throw new Error("Passwords do not match");
    }

    user.password = newPassword;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return {
      status: 'success',
      message: 'Votre mot de passe a été réinitialisé avec succès'
    };
  }

  private generateTokens(userId: string) {
    return {
      accessToken: this.tokenService.generateAccessToken(userId),
      refreshToken: this.tokenService.generateRefreshToken(userId)
    };
  }
}