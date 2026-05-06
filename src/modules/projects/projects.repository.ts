import { Types } from 'mongoose';
import { BaseRepository } from '../base/base.repository.js';
import Project, { IProject } from './projects.model.js';

export class ProjectRepository extends BaseRepository<IProject> {
  constructor(public model = Project) {
    super(Project);
  }

  async findByCode(code: string): Promise<IProject | null> {
    return this.model.findOne({ code }).exec();
  }

  async addAttachment(projectId: string, documentId: Types.ObjectId): Promise<IProject | null> {
    return this.model.findByIdAndUpdate(projectId, { $addToSet: { attachments: documentId } }, { new: true }).exec();
  }

  async removeAttachment(projectId: string, documentId: Types.ObjectId): Promise<IProject | null> {
    return this.model.findByIdAndUpdate(projectId, { $pull: { attachments: documentId } }, { new: true }).exec();
  }
}