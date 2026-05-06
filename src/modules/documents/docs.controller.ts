import { Request, Response } from 'express';
import { DocumentService } from './docs.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

export class DocumentController {
  constructor(private service: DocumentService) {}

  upload = catchAsync(async (req: Request | any, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);
    const { relatedModel, relatedId } = req.body;
    const doc = await this.service.uploadDocument(
      file,
      req.user._id,
      relatedModel && relatedId ? { model: relatedModel, id: relatedId } : undefined
    );
    res.status(201).json({ status: 'success', data: { document: doc } });
  });

  uploadMany = catchAsync(async (req: Request | any, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const { relatedModel, relatedId } = req.body;

    const docs = await this.service.uploadDocuments(
      files,
      req.user._id,
      relatedModel && relatedId ? { model: relatedModel, id: relatedId } : undefined
    );

    res.status(201).json({
      status: 'success',
      data: { documents: docs },
    });
  });

  getAll = catchAsync(async (req: Request, res: Response) => {
    const { relatedModel, relatedId, page, limit } = req.query;
    const result = await this.service.getDocuments({
      relatedModel: relatedModel as string,
      relatedId: relatedId as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: {
        documents: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  });

  search = catchAsync(async (req: Request, res: Response) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    // Filters from query (e.g., ?department=Engineering)
    const filters = { ...req.query };
    const excluded = ["page", "limit", "sort", "search"];
    excluded.forEach(key => delete filters[key]);

    const result = await this.service.searchDocuments(filters, { page, limit, sort, search });

    res.status(200).json({
      status: "success",
      results: result.data.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.data,
    });
  });

  getOne = catchAsync(async (req: Request | any, res: Response) => {
    const doc = await this.service.getDocumentById(req.params.id);
    res.status(200).json({ status: 'success', data: { document: doc } });
  });

  delete = catchAsync(async (req: Request | any, res: Response) => {
    await this.service.deleteDocument(req.params.id);
    res.status(204).send();
  });

  deleteMany = catchAsync(async (req: Request | any, res: Response) => {
    const ids: string[] = req.body.ids;
    await this.service.deleteDocuments(ids);
    res.status(204).send();
  });

  downloadById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = await this.service.getFileForDownload(String(id), 'id');

    res.setHeader('Content-Type', file.mimeType);
    res.download(file.path, file.originalName, (err) => {
      if (err) {
        throw new AppError('Error downloading file', 500);
      }
    });
  });

  downloadByFilename = catchAsync(async (req: Request, res: Response) => {
    const { filename } = req.params;
    const file = await this.service.getFileForDownload(String(filename), "filename");

    res.setHeader('Content-Type', file.mimeType);
    res.download(file.path, file.originalName, (err) => {
      if (err) {
        throw new AppError('Error downloading file', 500);
      }
    });
  });
}