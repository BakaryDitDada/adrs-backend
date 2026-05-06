import { Router } from 'express';
import { DocumentController } from './docs.controller.js';
import { DocumentService } from './docs.service.js';
import { DocumentRepository } from './docs.repository.js';
import { FileStorageFactory } from '../../services/fileStorage/fileStorage.factory.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { uploadMultiple, uploadSingle } from '../../config/multer.config.js';

const docsRouter: Router = Router();

const repo = new DocumentRepository();
const fileStorage = FileStorageFactory.create(process.env.FILE_STORAGE as any || 'disk');
// const fileStorage = FileStorageFactory.create(process.env.FILE_STORAGE as any || 'disk');
const service = new DocumentService(repo, fileStorage);
const controller = new DocumentController(service);

docsRouter.use(protect);
docsRouter.use(restrictTo('admin', 'hr', 'manager', 'user'));

docsRouter.post('/upload', uploadSingle('file'), controller.upload);
docsRouter.post('/upload-many', uploadMultiple('files', 5), controller.uploadMany);

docsRouter.get('/search-docs', controller.search);
docsRouter.get('/', controller.getAll);
docsRouter.get('/download/by-filename/:filename', controller.downloadByFilename);
docsRouter.get('/download/:id', controller.downloadById);
docsRouter.get('/:id', controller.getOne);

docsRouter.delete('/', controller.deleteMany);
docsRouter.delete('/:id', controller.delete);

export default docsRouter;