import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPayroll extends Document {
  employeeId: Types.ObjectId;        // reference to Employee
  payPeriodStart: Date;
  payPeriodEnd: Date;
  paymentDate: Date;
  grossPay: number;
  deductions: {
    tax: number;
    socialSecurity: number;
    other: number;
  };
  netPay: number;
  status: 'En attente' | 'Payé' | 'Annulé';
  paymentMethod: 'Banque' | 'Espèces' | 'Chèque';
  transactionReference?: string;      // bank transaction ID or check number
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const payrollSchema = new Schema<IPayroll>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    payPeriodStart: { type: Date, required: true },
    payPeriodEnd: { type: Date, required: true },
    paymentDate: { type: Date, required: true, index: true },
    grossPay: { type: Number, required: true, min: 0 },
    deductions: {
      tax: { type: Number, default: 0, min: 0 },
      socialSecurity: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    netPay: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['En attente', 'Payé', 'Annulé'],
      default: 'En attente',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Banque', 'Espèces', 'Chèque'],
      required: true,
    },
    transactionReference: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

payrollSchema.index({ payPeriodStart: 1, payPeriodEnd: 1 });

const Payroll = mongoose.model<IPayroll>('Payroll', payrollSchema);
export default Payroll;