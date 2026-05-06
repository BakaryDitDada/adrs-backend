import { Router } from 'express';
import { LeavesController } from './leaves.controller.js';
import { LeavesService } from './leaves.service.js';
import { LeavesRepository } from './leaves.repository.js';
import { EmployeeRepository } from '../employees/employees.repository.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import {
  validateCreateLeave,
  validateUpdateLeave,
  validateBulkCreateLeave,
  validateBulkUpdateLeave
} from './leaves.middleware.js';

const leaveRouter: Router = Router();

// Dependency injection
const leavesRepo = new LeavesRepository();
const employeeRepo = new EmployeeRepository();
const leavesService = new LeavesService(leavesRepo, employeeRepo);
const leavesController = new LeavesController(leavesService);

// All routes require authentication
leaveRouter.use(protect);

// ➡️ Bulk create leaves
leaveRouter.post(
  '/create-many',
  restrictTo('admin', 'hr', 'manager'),
  validateBulkCreateLeave,
  leavesController.createMany
);

// ➡️ Create single leave
leaveRouter.post(
  '/',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  validateCreateLeave,
  leavesController.create
);

// ➡️ Get Employee's leaves (with filters)
leaveRouter.get('/by-employee/:id',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  leavesController.getLeavesByEmployee
)

// ➡️ Get all leaves (with filters and pagination)
leaveRouter.get(
  '/advanced',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  leavesController.advancedList
);

// ➡️ Get all leaves (with filters)
leaveRouter.get(
  '/',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  leavesController.getAll
);

// ➡️ Get one leave by ID
leaveRouter.get('/:id', leavesController.getOne);

// ➡️ Bulk update leaves
leaveRouter.patch(
  '/update-many',
  restrictTo('admin', 'hr', 'manager'),
  validateBulkUpdateLeave,
  leavesController.updateMany
);

// ➡️ Cancel multiple leaves
leaveRouter.patch(
  '/cancel-many',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  leavesController.cancelMany
);

// ➡️ Approve/reject leave
leaveRouter.patch(
  '/approve/:id',
  restrictTo('admin', 'hr', 'manager'),
  validateUpdateLeave,
  leavesController.approve
);

// ➡️ Cancel single leave
leaveRouter.patch('/cancel/:id', leavesController.cancel);

// ➡️ Update single leave
leaveRouter.patch(
  '/:id',
  restrictTo('admin', 'hr', 'manager', 'employee'),
  validateUpdateLeave,
  leavesController.update
);

// ➡️ Hard delete multiple leaves
leaveRouter.delete(
  '/delete-many',
  restrictTo('admin'),
  leavesController.hardDeleteMany
);

// ➡️ Hard delete single leave
leaveRouter.delete(
  '/:id',
  restrictTo('admin'),
  leavesController.hardDelete
);

export default leaveRouter;