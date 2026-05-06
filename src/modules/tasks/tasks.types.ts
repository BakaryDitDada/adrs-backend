import { Types } from 'mongoose';

export interface TaskCreateInput {
  title: string;
  description?: string;
  type?: 'Réunion' | 'Mission de Terrain' | 'Atelier de Formation' | 'Tâche de Bureau' | 'Autre';
  status?: 'A Faire' | 'En Cours' | 'Terminé';
  percentage?: number;
  priority?: 'Elevée' | 'Médium' | 'Bas';
  assignedTo: Types.ObjectId[];
  startDate: Date;
  dueDate?: Date;
  projectId?: Types.ObjectId;
  categories?: Types.ObjectId[];
  notes?: string;
  createdBy: Types.ObjectId;
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {}

export interface TaskFilter {
  status?: string;
  assignedTo?: string;
  projectId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}