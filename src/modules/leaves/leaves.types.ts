// src/modules/leaves/leaves.types.ts
import { Types } from 'mongoose';
// import { ILeave } from './leaves.model.js';

export type LeaveType = 'Annuel' | 'Maladie' | 'Non payé' | 'Autre';
export type LeaveStatus = 'En attente' | 'Approuvé' | 'Rejeté' | 'Annulé';

export interface LeaveCreateInput {
  employeeId: Types.ObjectId;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status?: LeaveStatus;
  createdBy: Types.ObjectId;
}

export interface LeaveUpdateInput {
  type?: LeaveType;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  status?: LeaveStatus;
}

export interface LeaveApproveInput {
  approve: boolean;
  overrideBalance?: boolean;
  rejectionReason?: string;
}

export interface LeaveFilter {
  employeeId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  unpaid: number;
}