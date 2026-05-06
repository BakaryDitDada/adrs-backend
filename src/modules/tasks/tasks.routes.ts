import { Router } from 'express';
import { TaskController } from './tasks.controller.js';
import { TaskService } from './tasks.service.js';
import { TaskRepository } from './tasks.repository.js';
import { ProjectRepository } from '../projects/projects.repository.js';
import { DocumentService } from '../documents/docs.service.js';
import { DocumentRepository } from '../documents/docs.repository.js';

import { FileStorageFactory } from '../../services/fileStorage/fileStorage.factory.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateTasksBulkCreate, validateTaskCreate, validateTasksBulkUpdate, validateTaskUpdate } from './tasks.middleware.js';

const taskRouter: Router = Router();

// Dependencies
const docRepo = new DocumentRepository();
const fileStorage = FileStorageFactory.create(process.env.FILE_STORAGE as any || 'disk');
const docService = new DocumentService(docRepo, fileStorage);
const taskRepo = new TaskRepository();
const projectRepo = new ProjectRepository();
const taskService = new TaskService(taskRepo, projectRepo, docService);
const controller = new TaskController(taskService);

taskRouter.use(protect);
taskRouter.use(restrictTo('admin', 'hr', 'manager', 'employee'));

// --- CRUD Routes ---
taskRouter.post('/create-many', validateTasksBulkCreate, controller.createMany);
taskRouter.post('/', validateTaskCreate, controller.create);

taskRouter.get('/advanced', controller.advancedList);
taskRouter.get('/', controller.getAll);
taskRouter.get('/by-employee/:id', controller.getTasksByEmployee);
taskRouter.get('/:id', controller.getById);

taskRouter.patch('/update-many', validateTasksBulkUpdate, controller.updateMany);
taskRouter.patch('/:id', validateTaskUpdate, controller.update);

taskRouter.delete('/:id', controller.delete);
taskRouter.delete('/:id/soft', controller.softDelete);

// --- Bulk Operations ---
taskRouter.delete('/', controller.deleteMany);
taskRouter.delete('/soft', controller.softDeleteMany);

// --- Attachments ---
taskRouter.post('/:id/attachments', controller.addAttachment);
taskRouter.delete('/:id/attachments/:documentId', controller.removeAttachment);

export default taskRouter;