// src/modules/payroll/payroll.types.ts
import { Types } from 'mongoose';
// import { IPayroll } from './payrolls.model.js';

export interface Deductions {
  tax?: number;
  socialSecurity?: number;
  other?: number;
}

export interface PayrollCreateInput {
  employeeId: Types.ObjectId;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  paymentDate: Date;
  grossPay: number;
  deductions: Deductions;
  netPay: number;
  status?: 'En attente' | 'Payé' | 'Annulé';
  paymentMethod?: 'Banque' | 'Espèces' | 'Chèque';
  transactionReference?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
}

export interface PayrollUpdateInput {
  status?: 'En attente' | 'Payé' | 'Annulé';
  paymentMethod?: 'Banque' | 'Espèces' | 'Chèque';
  transactionReference?: string;
  notes?: string;
  paymentDate?: Date;
}

export interface PayrollFilter {
  employeeId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface BatchUpdateInput {
  payrollIds: string[];
  status?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  paymentDate?: Date;
}

export interface BatchCancelInput {
  payrollIds: string[];
  reason?: string;
}