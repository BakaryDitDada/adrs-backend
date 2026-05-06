import cron from 'node-cron';
import { CleanupService } from '../services/cleanup.service.js';
import { DocumentRepository } from '../modules/documents/docs.repository.js';
import { FileStorageFactory } from '../services/fileStorage/fileStorage.factory.js';
import logger from '../utils/logger.js';

// Initialize dependencies
const docRepo = new DocumentRepository();
const fileStorage = FileStorageFactory.create(process.env.FILE_STORAGE as any || 'disk');
const cleanupService = new CleanupService(docRepo, fileStorage);

// Schedule job: run every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting scheduled cleanup of orphaned documents...');
  try {
    const deleted = await cleanupService.deleteOrphanedDocuments();
    logger.info(`Cleanup job finished. Deleted ${deleted} documents.`);
  } catch (error: any) {
    logger.error('Cleanup job failed:', error);
  }
});

// Optional: also export a function to run manually (for testing)
export const runManualCleanup = () => cleanupService.deleteOrphanedDocuments();