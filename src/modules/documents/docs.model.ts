import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;        // For S3
  key?: string;        // For S3
  path?: string;       // For disk
  downloadUrl?: string;
  uploadedBy: mongoose.Types.ObjectId;
  relatedTo?: {
    model: 'Project' | 'Task';
    id: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: String,
    key: String,
    path: String,
    downloadUrl: String,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedTo: {
      model: { type: String, enum: ['Project', 'Task'] },
      id: { type: Schema.Types.ObjectId, refPath: 'relatedTo.model' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', documentSchema);