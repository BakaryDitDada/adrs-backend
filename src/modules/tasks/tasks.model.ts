import mongoose, { Schema, Types } from 'mongoose';

/**
 * Task Type Definition
 * - title: Title of the task
 * - description: Detailed description of the task
 * - type: Type of task (e.g., Meeting, Mission, Office Task, Other)
 */
type TaskType = {
  title: string;
  description?: string;
  type?: 'Réunion' | 'Mission de Terrain' | 'Atelier de Formation' | 'Tâche de Bureau' | 'Autre';
  status?: 'A Faire' | 'En Cours' | 'Terminé';
  percentage?: number;
  priority?: 'Elevée' | 'Médium' | 'Bas';
  assignedTo: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  startDate: Date;
  dueDate?: Date;
  projectId?: Types.ObjectId;
  completionDate?: Date;
  categories: Types.ObjectId[];
  notes: string;
  attachments?: {
    filename: string;
    originalName: string;
    downloadLink: string;
    extension: string;
    size?: number;
    mimeType?: string;
  }[];
  isDeleted?: boolean;
  deletedAt?: Date;
};

export type TTask = mongoose.Document & TaskType;

/**
 * Task Schema Definition
 * - Includes validations, virtuals, indexes, and middleware
 * - Soft delete implemented via isDeleted and deletedAt fields
 * - Virtual field durationDays calculates the duration between startDate and completionDate
 */
const taskSchema: mongoose.Schema<TTask> = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [120, 'Le titre ne peut pas dépasser 120 caractères']
    },
    description: { type: String, trim: true },
    status: {
      type: String,
      default: 'A Faire',
      enum: ['A Faire', 'En Cours', 'Terminé'],
    },
    type: {
      type: String,
      default: 'Réunion',
      enum: ['Réunion', 'Mission de Terrain', 'Rapport', 'Atelier de Formation', 'Tâche de Bureau', 'Autre'],
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    priority: {
      type: String,
      default: 'Médium',
      enum: ['Elevée', 'Médium', 'Bas'],
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startDate: { type: Date, default: Date.now() },
    dueDate: { type: Date },
    completionDate: {
      type: Date,
      validate: {
        validator: function(this: TTask, v: Date) {
          return !this.dueDate || v <= this.dueDate;
        },
        message: 'La date de réalisation ne peut pas être après la date d\'échéance'
      }
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    notes: { 
      type: String,
      minlength: [20, 'Minimum de charactères requis: 20'],
      maxlength: [500, 'Maximum de charactères autorisé: 500']
    },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    // attachments: [
    //   {
    //     filename: { type: String },
    //     originalName: { type: String },
    //     downloadLink: { type: String },
    //     // downloadLink: { type: String, match: /^https?:\/\//i },
    //     extension: { type: String },
    //     size: { type: Number },
    //     mimeType: { type: String },
    //   },
    // ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

/** 
 * Virtual Field: durationDays
 * @description Calculates the number of days between startDate and completionDate
 * @param this - Task document
 * @returns number of days or null if dates are not set
 */
taskSchema.virtual('durationDays').get(function(this: TTask) {
  if (!this.completionDate || !this.startDate) return null;
  const diff = this.completionDate.getTime() - this.startDate.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
});

// Indexes for task filtering and sorting
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ type: 1, createdBy: 1 });
taskSchema.index({ projectId: 1 });

/** 
 * Pre-save Middleware
 * @description Sets percentage to 100 and completionDate to current date if status is 'Terminé'
 * @throws Error if startDate is after dueDate
 * @param this - Task document
 * @returns void
 */
taskSchema.pre<TTask>('save', function() {
  if (this.status === 'Terminé' && this.percentage !== 100) {
    this.percentage = 100;
    this.completionDate = new Date();
  }

  // Ensure start date is before due date
  if (this.dueDate && this.startDate > this.dueDate) {
    throw new Error('La date de début doit être antérieure à la date d\'échéance');
  }

});

taskSchema.path('completionDate').validate(function (v: Date) {
  return !this.startDate || v >= this.startDate;
}, 'La date de réalisation ne peut pas être avant la date de début');

/**
 * @description Middleware to exclude soft-deleted documents from queries
 * @param this - Mongoose Query
 * @returns Modified Query
 */

// Pre-find middleware to exclude soft-deleted tasks (similar to Employee)
taskSchema.pre(/^find/, function (this: mongoose.Query<any, TTask> | any) {
  // Only apply if 'this' is a Query (not a Document)
  if (typeof this.getFilter === 'function') {
    if (!this.getFilter().hasOwnProperty('isDeleted')) {
      this.where({ isDeleted: false });
    }
  }
});

const Task = mongoose.model<TTask>('Task', taskSchema);

export default Task;