import { Types } from 'mongoose';
import { BaseRepository } from '../base/base.repository.js';
import Document, { IDocument } from './docs.model.js';
// Direct import can be set here if you prefer, but it may cause circular dependency issues. The dynamic approach in findOrphanedDocuments is more flexible and decoupled.
// import Project from '../projects/projects.model.js';
// import Task from '../tasks/tasks.model.js';

export class DocumentRepository extends BaseRepository<IDocument> {
  constructor() {
    super(Document);
  }

  async findByRelated(model: string, id: string): Promise<IDocument[]> {
    return this.model.find({ 'relatedTo.model': model, 'relatedTo.id': id }).exec();
  }

   /**
   * Find documents that are NOT referenced in any Project.attachments or Task.attachments.
   * Returns document IDs and their file identifiers (filename/key/path).
   */
  async findOrphanedDocuments(): Promise<IDocument[]> {
    // Dynamic lookup of Project and Task models to get referenced document IDs
    // This avoids circular dependencies and allows the repository to be more self-contained. Each model has a db property that allows us to access other models registered in the same connection.
    // NB: We can also use direct imports if we want, but this dynamic approach is more flexible and decoupled.
    const Project = this.model.db.model('Project');
    const Task = this.model.db.model('Task');

    // Get all document IDs that are referenced in Project.attachments
    const projectReferencedDocs = await Project.distinct('attachments', {
      attachments: { $exists: true, $ne: [] }
    });
    // Get all document IDs referenced in Task.attachments
    const taskReferencedDocs = await Task.distinct('attachments', {
      attachments: { $exists: true, $ne: [] }
    });

    const referencedIds = [
      ...projectReferencedDocs.map(id => id.toString()),
      ...taskReferencedDocs.map(id => id.toString())
    ];
    const uniqueReferencedIds = [...new Set(referencedIds)];

    // Find documents whose _id is NOT in the referenced list
    const orphaned = await this.model.find({
      _id: { $nin: uniqueReferencedIds.map(id => new Types.ObjectId(id)) }
    }).exec();

    return orphaned;
  }

  /**
   * Permanently delete a document by ID (used by cleanup job).
   */
  async hardDeleteById(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }
}