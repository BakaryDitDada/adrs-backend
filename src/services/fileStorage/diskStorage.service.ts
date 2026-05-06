import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IFileStorageService, UploadedFile } from './fileStorage.interface.js';
import AppError from '../../utils/appError.js';

export class DiskStorageService implements IFileStorageService {
  private basePath: string;

  constructor(baseUploadPath = 'uploads') {
    this.basePath = baseUploadPath;
    this.ensureBaseDir();
  }

  private async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  private async getFullPath(filename: string, folder?: string): Promise<string> {
    const dir = folder ? path.join(this.basePath, folder) : this.basePath;
    await fs.mkdir(dir, { recursive: true }); // ensure subdirectory exist
    return path.join(dir, filename);
  }

  async uploadSingle(file: Express.Multer.File, folder?: string): Promise<UploadedFile> {

    const ext = path.extname(file.originalname);
    const name = path.parse(file.originalname).name;

    const timestamp = Date.now().toString(36); // compact base36 timestamp
    const random = Math.random().toString(36).substring(2, 6); // 4 chars
    const shortUuid = uuidv4().split('-')[0];
    const filename = `${shortUuid}-${timestamp}-${random}-${name}${ext}`;
  
    const fullPath = await this.getFullPath(filename, folder);

    const downloadUrl = `${process.env.API_URL}/api/v1/documents/download/by-filename/${filename}`;

    await fs.writeFile(fullPath, file.buffer);

    return {
      filename: filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: fullPath,
      downloadUrl
    };
  }

  async uploadMultiple(files: Express.Multer.File[], folder?: string): Promise<UploadedFile[]> {
    return Promise.all(files.map(f => this.uploadSingle(f, folder)));
  }

  async deleteFile(fileIdentifier: string, folder?: string): Promise<void> {
    const fullPath = await this.getFullPath(fileIdentifier, folder);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw new AppError(`Echec de suppression du fichier: ${err.message}`, 500);
    }
  }

  async deleteMultiple(files: UploadedFile[], folder?: string): Promise<void> {
    await Promise.all(files.map(f => this.deleteFile(f.filename, folder)));
  }

  async getFileUrl(fileIdentifier: string, folder?: string): Promise<string> {
    // For disk storage, return a static URL path that will be served by Express
    const relativePath = folder ? `${folder}/${fileIdentifier}` : fileIdentifier;
    return `/uploads/${relativePath}`;
  }
}