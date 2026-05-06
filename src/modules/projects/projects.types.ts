import { Types } from 'mongoose';

export interface ProjectCreateInput {
  name: string;
  code: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status?: 'Planifié' | 'En cours' | 'Terminé' | 'Annulé/Suspendu';
  budget?: number;
  currency?: string;
  manager: Types.ObjectId;
  teamMembers?: Types.ObjectId[];
  createdBy: Types.ObjectId;
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {}

export interface ProjectFilter {
  status?: string;
  manager?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}