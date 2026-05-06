import { BaseRepository } from '../base/base.repository.js';
import Task, { TTask } from './tasks.model.js';
import { Types } from 'mongoose';

export class TaskRepository extends BaseRepository<TTask> {
  constructor(public model = Task) {
    super(Task);
  }

  async addAttachment(taskId: string, documentId: Types.ObjectId): Promise<TTask | null> {
    return this.model.findByIdAndUpdate(taskId, { $addToSet: { attachments: documentId } }, { new: true }).exec();
  }

  async removeAttachment(taskId: string, documentId: Types.ObjectId): Promise<TTask | null> {
    return this.model.findByIdAndUpdate(taskId, { $pull: { attachments: documentId } }, { new: true }).exec();
  }
}