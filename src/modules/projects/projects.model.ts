import mongoose, { Document, Schema, Types} from "mongoose";

// models/Project.ts
export interface IProject extends Document {
  name: string;
  code: string;                           // unique project code
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'Planifié' | 'En cours' | 'Terminé' | 'Annulé/Suspendu';
  budget?: number;
  percentage?: number;                                  // percentage completion
  currency?: string;
  manager: Types.ObjectId;                              // Employee (project manager)
  teamMembers: Types.ObjectId[];                        // Employee IDs
  fundingSources?: { name: string; amount: number }[];  // Optional funding sources
  tasks: Types.ObjectId[];                              // Task IDs
  attachments: Types.ObjectId[];                        // Document IDs
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    startDate: { type: Date, required: true, index: true },
    endDate: Date,
    status: {
      type: String,
      enum: ['Planifié', 'En cours', 'Terminé', 'Annulé/Suspendu'],
      default: 'Planifié',
      index: true,
    },
    budget: { type: Number, min: 0 },
    fundingSources: [{ name: String, amount: { type: Number, min: 0 } }],
    percentage: { type: Number, min: 0, max: 100 },
    currency: { type: String, default: 'XOF' },
    manager: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Pre-find middleware to exclude soft-deleted projects
projectSchema.pre(/^find/, function (this: mongoose.Query<any, IProject> | any, next: (err?: any) => void) {
  // Only apply if 'this' is a Query (not a Document)
  if (typeof this.getFilter === 'function') {
    if (!this.getFilter().hasOwnProperty('isDeleted')) {
      this.where({ isDeleted: false });
    }
  }
  // next();
});

const Project = mongoose.model<IProject>('Project', projectSchema);

export default Project;