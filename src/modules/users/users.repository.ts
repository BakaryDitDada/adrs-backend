import { Types } from 'mongoose';
import { BaseRepository } from '../base/base.repository.js';
import User, { IUser } from '../users/users.model.js';

export class UserRepository extends BaseRepository<IUser | any> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<any> {
    return User.findOne({ email }).select('+password');
  }

  async createUser(data: any, validate: boolean = true): Promise<any> {
    const user = new User(data);
    if (validate) {
      return user.save();
    } else {
      return user.save({ validateBeforeSave: false });
    }
  }

  async updateUser(id: string | Types.ObjectId, updates: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).exec();
  }

}