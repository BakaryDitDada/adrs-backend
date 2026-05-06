import { DocumentRepository } from '../modules/documents/docs.repository.js';
import { IFileStorageService } from './fileStorage/fileStorage.interface.js';
import logger from '../utils/logger.js'; // you'll need to implement a simple logger

export class CleanupService {
  constructor(
    private docRepo: DocumentRepository,
    private fileStorage: IFileStorageService
  ) {}

  /**
   * Delete all orphaned documents (unreferenced) – both DB records and physical files.
   * Returns number of deleted documents.
   */
  async deleteOrphanedDocuments(): Promise<number> {
    try {
      const orphanedDocs = await this.docRepo.findOrphanedDocuments();
      if (orphanedDocs.length === 0) {
        logger.info('No orphaned documents found.');
        return 0;
      }

      logger.info(`Found ${orphanedDocs.length} orphaned documents. Starting deletion...`);

      let deletedCount = 0;
      for (const doc of orphanedDocs) {
        try {
          // Delete physical file from storage
          if (doc.key) {
            await this.fileStorage.deleteFile(doc.key, 'documents');
          } else if (doc.filename) {
            await this.fileStorage.deleteFile(doc.filename, 'documents');
          }

          // Delete database record
          await this.docRepo.hardDeleteById(doc._id.toString());
          deletedCount++;
          logger.debug(`Deleted orphaned document: ${doc._id} (${doc.originalName})`);
        } catch (err: any) {
          logger.error(`Failed to delete document ${doc._id}:`, err);
          // Continue with next document
        }
      }

      logger.info(`Successfully deleted ${deletedCount} orphaned documents.`);
      return deletedCount;
    } catch (error: any) {
      logger.error('Error in orphaned documents cleanup:', error);
      throw error;
    }
  }
}