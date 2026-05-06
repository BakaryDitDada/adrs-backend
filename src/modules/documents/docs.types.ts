import { Types } from 'mongoose';

export interface DocumentCreateInput {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  key?: string;
  path?: string;
  downloadUrl?: string;
  uploadedBy: Types.ObjectId;
  relatedTo?: { model: 'Project' | 'Task'; id: Types.ObjectId };
}

export interface DocumentFilter {
  relatedModel?: string;
  relatedId?: string;
  page?: number;
  limit?: number;
}