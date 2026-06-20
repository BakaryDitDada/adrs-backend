import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiRepository } from './ai.repository.js';
import { AiProviderFactory } from './providers/factory.provider.js';
import { EmployeeRepository } from '../employees/employees.repository.js';
import { LeavesRepository } from '../leaves/leaves.repository.js';
import { ProjectRepository } from '../projects/projects.repository.js';
import { TaskRepository } from '../tasks/tasks.repository.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validateChat, validateGenerateReport } from './ai.middleware.js';

const aiRouter: Router = Router();

// Dependencies
const aiRepo = new AiRepository();
const provider = AiProviderFactory.create(process.env.AI_PROVIDER as any || 'gemini');
// const provider = AiProviderFactory.create('openai');
const model = provider.getModel();

const employeeRepo = new EmployeeRepository();
const leaveRepo = new LeavesRepository();
const projectRepo = new ProjectRepository();
const taskRepo = new TaskRepository();

const aiService = new AiService(
  aiRepo, model,
  employeeRepo, leaveRepo, projectRepo, taskRepo
);
const aiController = new AiController(aiService);

aiRouter.use(protect);

aiRouter.post('/chat', validateChat, aiController.chat);
aiRouter.post('/chat/stream', validateChat, aiController.streamChat); 
aiRouter.get('/conversations', aiController.getConversations);
aiRouter.get('/conversations/:id', aiController.getConversationHistory);
aiRouter.delete('/conversations/:id', aiController.deleteConversation);

aiRouter.get('/reports', restrictTo('admin'), aiController.getReports);
aiRouter.post('/reports', restrictTo('admin'), aiController.generateReport);
aiRouter.post('/reports/stream', restrictTo('admin'), aiController.streamReport);
aiRouter.delete('/reports/:id', restrictTo('admin'), aiController.deleteReport);

export default aiRouter;