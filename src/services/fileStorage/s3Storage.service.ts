import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IFileStorageService, UploadedFile } from './fileStorage.interface.js';
// import AppError from '../../utils/appError.js';

export class S3StorageService implements IFileStorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.AWS_BUCKET_NAME!;
  }

  private getKey(filename: string, folder?: string): string {
    return folder ? `${folder}/${filename}` : filename;
  }

  async uploadSingle(file: Express.Multer.File, folder?: string): Promise<UploadedFile> {
    const key = this.getKey(file.filename, folder);
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });
    const result = await upload.done();
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: result.Location,
      key,
    };
  }

  async uploadMultiple(files: Express.Multer.File[], folder?: string): Promise<UploadedFile[]> {
    return Promise.all(files.map(f => this.uploadSingle(f, folder)));
  }

  async deleteFile(fileIdentifier: string, folder?: string): Promise<void> {
    const key = this.getKey(fileIdentifier, folder);
    await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deleteMultiple(files: UploadedFile[], folder?: string): Promise<void> {
    await Promise.all(files.map(f => this.deleteFile(f.filename, folder)));
  }

  async getFileUrl(fileIdentifier: string, folder?: string): Promise<string> {
    const key = this.getKey(fileIdentifier, folder);
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}