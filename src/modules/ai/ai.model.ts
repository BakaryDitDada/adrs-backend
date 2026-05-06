import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAiConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiReport extends Document {
  userId: Types.ObjectId;
  type: 'project_status' | 'employee_summary' | 'payroll_summary' | 'custom';
  relatedId?: Types.ObjectId; // e.g., projectId
  content: string; // Markdown or JSON
  createdAt: Date;
}

const conversationSchema = new Schema<IAiConversation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New Conversation' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const reportSchema = new Schema<IAiReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['project_status', 'employee_summary', 'payroll_summary', 'task_summary', 'custom'], required: true },
  relatedId: { type: Schema.Types.ObjectId },
  content: { type: String, required: true },
}, { timestamps: true });

export const AiConversation = mongoose.model<IAiConversation>('AiConversation', conversationSchema);
export const AiReport = mongoose.model<IAiReport>('AiReport', reportSchema);