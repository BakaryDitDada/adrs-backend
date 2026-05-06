import { IFileStorageService } from './fileStorage.interface.js';
import { DiskStorageService } from './diskStorage.service.js';
import { S3StorageService } from './s3Storage.service.js';

export class FileStorageFactory {
  static create(storageType: 'disk' | 's3' = 'disk'): IFileStorageService {
    switch (storageType) {
      case 's3':
        return new S3StorageService();
      case 'disk':
      default:
        return new DiskStorageService();
    }
  }
}