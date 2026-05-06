import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeave extends Document {
  employeeId: Types.ObjectId;
  type: "Annuel" | "Maladie" | "Non payé" | "Autre";
  startDate: Date;
  endDate: Date;
  days: number; // calculated automatically from dates
  reason?: string;
  status: 'En attente' | 'Approuvé' | 'Rejeté' | 'Annulé';
  approvedBy?: Types.ObjectId; 
  approvedAt?: Date;
  rejectionReason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<ILeave>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Annuel', 'Maladie', 'Non payé', 'Autre'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['En attente', 'Approuvé', 'Rejeté', 'Annulé'],
      default: 'En attente',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Pre-save middleware to calculate days if not provided
leaveSchema.pre<ILeave>('validate', function (this: ILeave) {
  if (!this.days && this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    this.days = diffDays;
  }
  // return;
});

leaveSchema.virtual('duration').get(function (this: ILeave) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  return 0;
});

// Indexes
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

const Leave = mongoose.model<ILeave>('Leave', leaveSchema);

export default Leave;