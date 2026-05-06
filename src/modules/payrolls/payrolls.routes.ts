// src/modules/payroll/payroll.routes.ts
import { Router } from 'express';
import { PayrollController } from './payrolls.controller.js';
import { PayrollService } from './payrolls.service.js';
import { PayrollRepository } from './payrolls.repository.js';
import { EmployeeRepository } from '../employees/employees.repository.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validatePayrollCreate, validatePayrollUpdate, validatePayrollBulkUpdate, validatePayrollBulkCancel } from './payrolls.middleware.js';

const payrollRouter: Router = Router();

// Dependency injection
const payrollRepo = new PayrollRepository();
const employeeRepo = new EmployeeRepository();
const payrollService = new PayrollService(payrollRepo, employeeRepo);
const payrollController = new PayrollController(payrollService);

// All routes require authentication, and typically HR/Admin role
payrollRouter.use(protect);
payrollRouter.use(restrictTo('admin', 'hr'));

payrollRouter.post('/batch-update', validatePayrollBulkUpdate, payrollController.batchUpdate);
payrollRouter.post('/batch-cancel', validatePayrollBulkCancel, payrollController.batchCancel);
payrollRouter.post(
  '/',
  validatePayrollCreate,
  payrollController.createPayrollBatch
);


payrollRouter.get(
  '/',
  payrollController.getAllPayrolls
);
payrollRouter.get('/:id', payrollController.getPayroll);

payrollRouter.patch('/:id', validatePayrollUpdate, payrollController.updatePayroll);

payrollRouter.delete('/:id', payrollController.cancelPayroll); // or POST /cancel/:id

export default payrollRouter;