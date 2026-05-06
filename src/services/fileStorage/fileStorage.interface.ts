export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path?: string;        // for disk storage
  downloadUrl?: string;
  url?: string;         // for S3
  key?: string;         // for S3
}

export interface IFileStorageService {
  uploadSingle(file: Express.Multer.File, folder?: string): Promise<UploadedFile>;
  uploadMultiple(files: Express.Multer.File[], folder?: string): Promise<UploadedFile[]>;
  deleteFile(fileIdentifier: string, folder?: string): Promise<void>;
  deleteMultiple(files: UploadedFile[], folder?: string): Promise<void>;
  getFileUrl(fileIdentifier: string, folder?: string): Promise<string>;
}