import { Schema, model, Document, Model } from "mongoose";
import { randomBytes, createHash } from "crypto";
import bcrypt from 'bcryptjs';
import validator from 'validator';

/**
 * User Interface
 * Defines the structure of a User document in MongoDB
 * Includes fields for authentication, roles, and status
 * Also includes optional fields for profile information
 * Methods for password validation and reset are defined separately
 */
export interface IUser extends Document {
  username: string;
  email: string;
  service_number: string;
  password: string;
  passwordConfirm?: string | undefined;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'super_admin' | 'admin' | 'user' | 'employee' | 'hr' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  refreshToken?: String;
  passwordChangedAt?: Date | null | number | any;
  passwordResetToken?: String;
  passwordResetExpires?: Date | null | number | any;
}

/** 
 * User Methods Interface
 * Defines instance methods for User documents
 * Includes methods for password validation, checking password changes, and generating reset tokens
 */
interface IUserMethods {
  correctPassword: (enteredPassword: string, savedPassword: string) => Promise<boolean>;
  changedPasswordAfter: (JWTTimestamp: number) => boolean;
  generatePasswordResetToken: () => string;
}

export type TUserModel = Model<IUser, {}, IUserMethods>;

/**
 * User Schema
 * Defines the Mongoose schema for the User model
 * Includes field definitions, validations, indexes, and middleware
 */
const userSchema: Schema<IUser, TUserModel, IUserMethods> = new Schema({
  username: {
    type: String,
    required: [true, 'User name is required!']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email, it is required!'],
    unique: true,
    validate: [validator.isEmail, 'Please provide a valide email!'],
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'user', 'employee', 'hr', 'manager'],
    default: 'user'
  },
  service_number: {
    type: String,
    maxlength: 100,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please enter your password!'],
    minlength: 8,
    select: false // Prevent password from being returned in query results
  },
  // passwordConfirm: {
  //   type: String,
  //   required: [true, 'S\'il vous plaît confirmer votre mot de passe!'],
  //   validate: {
  //     validator: function(this: IUser, el: string) {
  //       return el === this.password;
  //     },
  //     message: 'Passwords are not the same!!!'
  //   },
  //   select: false // Prevent passwordConfirm from being returned in query results
  // },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    select: false // Prevent activate status from being returned in query results
  },
  firstName: { type: String },
  lastName: { type: String },
  avatar: { type: String },
  lastLogin: Date,
  refreshToken: String,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
},
{ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
);

userSchema.index({ service_number: 1 });
userSchema.index({ status: 1, role: 1 });

userSchema.virtual('passwordConfirm')
  .set(function(this: IUser, value: string) {
    (this as any)._passwordConfirm = value;
  })
  .get(function(this: IUser) {
    return (this as any)._passwordConfirm;
  });

/**
 * Hash the password before saving the user.
 * @param next - Callback to proceed with the save operation
 * @throws Error if password confirmation does not match
 */
// userSchema.pre<IUser>('save', async function(next: Function | any) { 
userSchema.pre<IUser>('save', async function() { 
  if (!this.isModified('password')) return;
 
  // if ((this as any)._passwordConfirm !== this.password) { 
  //   throw new Error('Mot de passe et confirmation du mot de passe ne correspondent pas!'); 
  // } 
  
  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  
});

/** 
 * Set passwordChangedAt field before saving if the password was modified
 * @param next - Callback to proceed with the save operation
 * Adjusts the timestamp to ensure it is before the JWT issuance time
 * Prevents potential issues with token validation
 */
userSchema.pre<IUser>('save', async function() {
// userSchema.pre<IUser>('save', async function(next: Function | any) {
  if(!this.isModified('password') || this.isNew) return;

  this.passwordChangedAt = Date.now() - 1000;

});
userSchema.pre(/^find/, function(this: Model<IUser>) { 
// userSchema.pre(/^find/, async function(this: Model<IUser>) { 
  this.find({status: { $ne: 'inactive' }});
})

/**
 * Compare entered password with the saved hashed password
 * @param enteredPassword 
 * @param savedPassword 
 * @returns Promise<boolean> - True if passwords match, false otherwise
 */
userSchema.methods.correctPassword = async function(enteredPassword, savedPassword) {
  return await bcrypt.compare(enteredPassword, savedPassword);
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp): boolean {
  if(this.passwordChangedAt) {
    const changedTimestamp = this.passwordChangedAt.getTime()/1000;
    return JWTTimestamp < changedTimestamp;
  }

  return false;
}

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = randomBytes(32).toString('hex');

  this.passwordResetToken = createHash('sha256').update(resetToken).digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
}

const User = model<IUser, TUserModel>('User', userSchema);

export default User;