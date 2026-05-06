import { Types } from 'mongoose';
import User, { IUser } from '../users/users.model.js';
import { BaseRepository } from '../base/base.repository.js';

export class AuthRepository extends BaseRepository<IUser | any> {
  constructor() {
    super(User);
  }

  async createUser(data: any, validate: boolean = true): Promise<any> {
    const user = new User(data);
    if (validate) {
      return user.save();
    } else {
      return user.save({ validateBeforeSave: false });
    }
  }

  async saveRefreshToken(userId: string, hashedToken: string): Promise<any> {
    return User.findByIdAndUpdate(userId, {
      refreshToken: hashedToken
    }, {new: true}).exec();
  }

  async findByRefreshToken(hashedToken: string): Promise<any> {
    return User.findOne({ refreshToken: hashedToken });
  }

  async clearRefreshToken(userId: string): Promise<any> {
    return User.findByIdAndUpdate(userId, {
      refreshToken: null
    });
  }

  async setPasswordResetToken(userId: string | Types.ObjectId, hashedToken: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    }).exec();
  }

  async findByPasswordResetToken(hashedToken: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).exec();
  }
}