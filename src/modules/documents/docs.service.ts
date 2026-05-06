import mongoose from 'mongoose';
import fs from 'fs/promises';
import { DocumentRepository } from './docs.repository.js';
// import { DiskStorageService } from '../../services/fileStorage/diskStorage.service.js';
import { IFileStorageService } from '../../services/fileStorage/fileStorage.interface.js';
import { DocumentCreateInput, DocumentFilter } from './docs.types.js';
import AppError from '../../utils/appError.js';
import { IDocument } from './docs.model.js';

export class DocumentService {
  constructor(
    private repo: DocumentRepository,
    private fileStorage: IFileStorageService
  ) {}

  async uploadDocument(file: Express.Multer.File, uploadedBy: string, relatedTo?: { model: 'Project' | 'Task'; id: string }): Promise<IDocument> {
    const uploaded = await this.fileStorage.uploadSingle(file, 'documents');

    const docData: DocumentCreateInput = {
      filename: uploaded.filename,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimetype,
      size: uploaded.size,
      url: uploaded.url,
      key: uploaded.key,
      path: uploaded.path,
      downloadUrl: uploaded.downloadUrl,
      uploadedBy: new mongoose.Types.ObjectId(uploadedBy),
      relatedTo: relatedTo ? { model: relatedTo.model, id: new mongoose.Types.ObjectId(relatedTo.id) } : undefined,
    };
    return this.repo.create(docData);
  }

  async uploadDocuments(
    files: Express.Multer.File[],
    uploadedBy: string,
    relatedTo?: { model: 'Project' | 'Task'; id: string }
  ): Promise<IDocument[]> {
    // Upload all files in parallel
    const uploadedFiles = await Promise.all(
      files.map(file => this.fileStorage.uploadSingle(file, 'documents'))
    );

    // Map uploaded file metadata to DocumentCreateInput
    const docsData: DocumentCreateInput[] = uploadedFiles.map(uploaded => ({
      filename: uploaded.filename,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimetype,
      size: uploaded.size,
      url: uploaded.url,
      key: uploaded.key,
      path: uploaded.path,
      downloadUrl: uploaded.downloadUrl,
      uploadedBy: new mongoose.Types.ObjectId(uploadedBy),
      relatedTo: relatedTo
        ? { model: relatedTo.model, id: new mongoose.Types.ObjectId(relatedTo.id) }
        : undefined,
    }));

    // Persist all documents in parallel
    return Promise.all(docsData.map(doc => this.repo.create(doc)));
  }

  async getDocuments(filter: DocumentFilter) {
    const { relatedModel, relatedId, page = 1, limit = 10 } = filter;
    const query: any = {};
    if (relatedModel && relatedId) {
      query['relatedTo.model'] = relatedModel;
      query['relatedTo.id'] = relatedId;
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repo.findWithPopulations(query, { skip, limit, sort: { createdAt: -1 } }),
      this.repo.count(query),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async searchDocuments(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ) {
    // Use base repository's findAll which supports filter, pagination, sort, search, populate
    return this.repo.findAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["filename", "originalName", "relatedTo"], // for APIFeatures search
      // populate: populateOptions,
    });
  }

  async getDocumentById(id: string): Promise<IDocument> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new AppError('Document not found', 404);
    // Delete physical file
    if (doc.key) await this.fileStorage.deleteFile(doc.key, 'documents');
    else if (doc.filename) await this.fileStorage.deleteFile(doc.filename, 'documents');
    await this.repo.deleteById(id);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new AppError('No document IDs provided', 400);
    }

    // Run deletions in parallel
    await Promise.all(ids.map(async (id) => {
      const doc = await this.repo.findById(id);
      if (!doc) throw new AppError(`Document with id ${id} not found`, 404);

      // Delete physical file
      if (doc.key) {
        await this.fileStorage.deleteFile(doc.key, 'documents');
      } else if (doc.filename) {
        await this.fileStorage.deleteFile(doc.filename, 'documents');
      }

      // Delete record from the database
      await this.repo.deleteById(id);
    }));
  }

  async getFileForDownload(param: string, type: string): Promise<{ path: string; originalName: string; mimeType: string }> {
    let doc: any;
    if(type === "id") {
      doc = await this.repo.findById(param);
    } else if(type === "filename") {
      doc = await this.repo.findOne({ filename: param });
    }

    if (!doc) throw new AppError('Aucun document trouvé!', 404);

    // Use the stored path if available
    if (!doc.path) throw new AppError('File path not found', 404);

    // Check file exists
    try {
      await fs.access(doc.path);
    } catch {
      throw new AppError("Le fichier n'existe!", 404);
    }

    return {
      path: doc.path,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
    };
  }

}