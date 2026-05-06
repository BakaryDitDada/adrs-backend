import mongoose, { Schema, Document, Types } from 'mongoose';
import validator from 'validator';

export interface IEmployee extends Document {
  userId?: Types.ObjectId;
  workEmail: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  nextPayDate?: Date;
  // gender?: 'Male' | 'Female';
  gender?: 'Homme' | 'Femme';
  // maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  maritalStatus?: 'Célébataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)';
  nationalId?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    personalEmail: string;
  };
  position: string;
  department: string;
  managerId?: Types.ObjectId;
  hireDate: Date;
  contractType: 'CDI' | 'CDD' | 'Stagiaire' | 'Consultant' | "Fonctionnaire";
  contractEndDate?: Date;
  employmentStatus: 'En activité' | 'En formation' | 'Licencié' | 'En congé' | "Contrat terminé" | "A la retraite";
  terminationDate?: Date;

  salaryInfo: {
    baseSalary: number;
    currency: string; // e.g., 'XOF' for Mali
    payFrequency: 'Mensuel' | 'Hebdomadaire' | 'Bi-hebdomadaire';
    bankAccount?: {
      bankName: string;
      accountNumber: string; // ⚠️ encrypt in production
      accountHolder: string;
    };
    allowances?: {
      transportation?: number;
      housing?: number;
      other?: number;
    };
    deductions?: {
      tax?: number;
      socialSecurity?: number;
      other?: number;
    };
  };

  leaveBalance: {
    annual: number;
    sick: number;
    unpaid: number;
  };

  // Audit fields
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    workEmail: { type: String, required: true, unique: true, lowercase: true, validate: validator.isEmail },
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['Homme', 'Femme'] },
    maritalStatus: { type: String, enum: ['Célébataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'] },
    nationalId: { type: String, sparse: true },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    contact: {
      phone: { type: String, required: true, validate: validator.isMobilePhone },
      personalEmail: { type: String, required: true, lowercase: true, validate: validator.isEmail },
    },
    position: { type: String, required: true },
    department: { type: String, required: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    hireDate: { type: Date, required: true, index: true },
    contractType: {
      type: String,
      enum: ['CDI', 'CDD', 'Stagiaire', 'Consultant', "Fonctionnaire"],
      required: true,
    },
    contractEndDate: Date,
    employmentStatus: {
      type: String,
      // enum: ['active', 'inactive', 'terminated', 'on-leave'],
      enum: ['En activité', 'En formation', 'Licencié', 'En congé', "Contrat terminé", "A la retraite"],
      default: 'En activité',
      index: true,
    },
    terminationDate: Date,
    salaryInfo: {
      baseSalary: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'XOF', uppercase: true },
      payFrequency: {
        type: String,
        enum: ['Mensuel', 'Hebdomadaire', 'Bi-hebdomadaire'],
        required: true,
      },
      bankAccount: {
        bankName: String,
        accountNumber: String, // ⚠️ encrypt before saving
        accountHolder: String,
      },
      allowances: {
        transportation: Number,
        housing: Number,
        other: Number,
      },
      deductions: {
        tax: Number,
        socialSecurity: Number,
        other: Number,
      },
    },
    nextPayDate: { 
      type: Date, 
      index: true,        // Important for fast queries in the cron job
      default: null 
    },
    leaveBalance: {
      annual: { type: Number, default: 0, min: 0 },
      sick: { type: Number, default: 0, min: 0 },
      unpaid: { type: Number, default: 0, min: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Indexes for common queries
employeeSchema.index({ department: 1, employmentStatus: 1 });
employeeSchema.index({ 'salaryInfo.payFrequency': 1 });

// Pre-find middleware to exclude soft-deleted records
employeeSchema.pre(/^find/, async function(this: mongoose.Query<any, IEmployee>) {
  if (!this.getFilter().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: false });
  }
  // next();
});

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
export default Employee;