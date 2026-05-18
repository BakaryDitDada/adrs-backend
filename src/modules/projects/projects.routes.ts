import { Router } from 'express';
import { ProjectController } from './projects.controller.js';
import { ProjectService } from './projects.service.js';
import { ProjectRepository } from './projects.repository.js';
import { DocumentService } from '../documents/docs.service.js';
import { DocumentRepository } from '../documents/docs.repository.js';
import { FileStorageFactory } from '../../services/fileStorage/fileStorage.factory.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateProjectCreate, validateProjectUpdate, validateProjectsBulkCreate, validateProjectsBulkUpdate } from './projects.middleware.js';

const projectsRouter: Router = Router();

// Instantiate dependencies
const docRepo = new DocumentRepository();
const fileStorage = FileStorageFactory.create(process.env.FILE_STORAGE as any || 'disk');
const docService = new DocumentService(docRepo, fileStorage);
const projectRepo = new ProjectRepository();
const projectService = new ProjectService(projectRepo, docService);
const controller = new ProjectController(projectService);

projectsRouter.use(protect);
projectsRouter.use(restrictTo('admin', 'hr', 'manager', 'user'));

// --- CRUD Routes ---
projectsRouter.post('/create-many', validateProjectsBulkCreate, controller.createMany);
projectsRouter.post('/', validateProjectCreate, controller.create);

// projectsRouter.get('/', controller.getAll); // Get all projects (with filters/pagination)
projectsRouter.get('/', controller.list);
projectsRouter.get('/:id', controller.getOne); // Get single project by ID

projectsRouter.patch('/update-many', validateProjectsBulkUpdate, controller.updateMany);
projectsRouter.patch('/:id', validateProjectUpdate, controller.update); // Update project

projectsRouter.delete('/:id', controller.delete); // Hard delete project
projectsRouter.delete('/:id/soft', controller.softDelete); // Soft delete project

// --- Bulk Operations ---
projectsRouter.delete('/', controller.deleteMany);// Hard delete multiple projects
projectsRouter.delete('/soft', controller.softDeleteMany); // Soft delete multiple projects

// --- Attachments ---
projectsRouter.post('/:id/attachments', controller.addAttachment); // Add attachment to project
projectsRouter.delete('/:id/attachments/:documentId', controller.removeAttachment); // Remove attachment

export default projectsRouter;