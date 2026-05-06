// src/modules/payroll/payroll.service.ts
import { Types } from 'mongoose';
import { PayrollRepository } from './payrolls.repository.js';
import { EmployeeRepository } from '../employees/employees.repository.js'; // assuming employee module exists
import { calculateNextPayDate } from '../../utils/dateUtils.js';
import AppError from '../../utils/appError.js';
import {
  // PayrollCreateInput,
  PayrollUpdateInput,
  PayrollFilter,
  BatchUpdateInput,
  BatchCancelInput,
} from './payrolls.types.js';
import { IPayroll } from './payrolls.model.js';

export class PayrollService {
  constructor(
    private payrollRepo: PayrollRepository,
    private employeeRepo: EmployeeRepository
  ) {}

  private calculateNetPay(gross: number, deductions: { tax?: number; socialSecurity?: number; other?: number }): number {
    const total = (deductions.tax || 0) + (deductions.socialSecurity || 0) + (deductions.other || 0);
    return gross - total;
  }

  async createPayrollBatch(
    employeeIds: string[] | undefined,
    payPeriodStart: Date,
    payPeriodEnd: Date,
    paymentDate: Date,
    customData: Record<string, any>,
    creatorId?: Types.ObjectId
  ): Promise<{ createdPayrolls: IPayroll[]; errors: { employeeId: string; reason: string }[] }> {
    // Validate date range
    if (payPeriodStart >= payPeriodEnd) {
      throw new AppError('Pay period start must be before end', 400);
    }

    // Fetch employees
    let employees: any[] = [];
    if (employeeIds && employeeIds.length > 0) {
      const validIds = employeeIds.filter(id => Types.ObjectId.isValid(id));
      if (validIds.length === 0) throw new AppError('No valid employee IDs provided', 400);
      employees = (await this.employeeRepo.findAll({ _id: { $in: validIds }, isDeleted: false, employmentStatus: 'active' })).data;
    } else {
      employees = (await this.employeeRepo.findAll({ isDeleted: false, employmentStatus: 'active' })).data;
    }

    if (employees.length === 0) throw new AppError('No active employees found', 404);

    const payrollDocs: Partial<IPayroll>[] = [];
    const errors: { employeeId: string; reason: string }[] = [];

    for (const emp of employees) {
      // Check for duplicate period
      const existing = await this.payrollRepo.findByEmployeeAndPeriod(emp._id, payPeriodStart, payPeriodEnd);
      if (existing) {
        errors.push({ employeeId: emp.employeeId, reason: 'Payroll already exists for this period' });
        continue;
      }

      let grossPay: number;
      let deductions = { tax: 0, socialSecurity: 0, other: 0 };

      if (customData && customData[emp.employeeId]) {
        const cust = customData[emp.employeeId];
        grossPay = cust.grossPay ?? emp.salaryInfo.baseSalary;
        deductions = {
          tax: cust.deductions?.tax ?? emp.salaryInfo.deductions?.tax ?? 0,
          socialSecurity: cust.deductions?.socialSecurity ?? emp.salaryInfo.deductions?.socialSecurity ?? 0,
          other: cust.deductions?.other ?? emp.salaryInfo.deductions?.other ?? 0,
        };
      } else {
        grossPay = emp.salaryInfo.baseSalary;
        deductions = {
          tax: emp.salaryInfo.deductions?.tax ?? 0,
          socialSecurity: emp.salaryInfo.deductions?.socialSecurity ?? 0,
          other: emp.salaryInfo.deductions?.other ?? 0,
        };
      }

      const netPay = this.calculateNetPay(grossPay, deductions);

      payrollDocs.push({
        employeeId: emp._id,
        payPeriodStart,
        payPeriodEnd,
        paymentDate,
        grossPay,
        deductions,
        netPay,
        status: 'pending',
        paymentMethod: customData?.[emp.employeeId]?.paymentMethod || (emp.salaryInfo.bankAccount ? 'bank' : 'cash'),
        transactionReference: customData?.[emp.employeeId]?.transactionReference,
        notes: customData?.[emp.employeeId]?.notes,
        createdBy: creatorId,
      });
    }

    if (payrollDocs.length === 0) {
      throw new AppError('No payroll records created due to conflicts or missing data', 400);
    }

    const createdPayrolls = await this.payrollRepo.bulkCreate(payrollDocs);
    // Populate employee and creator
    await this.payrollRepo.model.populate(createdPayrolls, [
      { path: 'employeeId', select: 'firstName lastName employeeId department' },
      { path: 'createdBy', select: 'username email' },
    ]);

    return { createdPayrolls, errors };
  }

  async getPayrolls(filter: PayrollFilter) {
    const { employeeId, status, fromDate, toDate, page = 1, limit = 10 } = filter;
    const query: any = {};

    if (employeeId && Types.ObjectId.isValid(employeeId)) query.employeeId = employeeId;
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.paymentDate = {};
      if (fromDate) query.paymentDate.$gte = fromDate;
      if (toDate) query.paymentDate.$lte = toDate;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.payrollRepo.findWithPopulations(query, {
        skip,
        limit,
        sort: { paymentDate: -1, createdAt: -1 },
        populate: ['employeeId', 'createdBy'],
      }),
      this.payrollRepo.count(query),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getPayrollById(id: string): Promise<IPayroll> {
    const payroll = await this.payrollRepo.findById(id);
    if (!payroll) throw new AppError('Payroll record not found', 404);
    // Populate manually if needed
    await this.payrollRepo.model.populate(payroll, [
      { path: 'employeeId', select: 'firstName lastName employeeId department position salaryInfo' },
      { path: 'createdBy', select: 'username email' },
    ]);
    return payroll;
  }

  async updatePayroll(id: string, updateData: PayrollUpdateInput): Promise<IPayroll> {
    const payroll = await this.payrollRepo.updateById(id, updateData);
    if (!payroll) throw new AppError('Payroll record not found', 404);

    // If status changed to 'paid' and paymentDate provided, update employee's nextPayDate
    if (updateData.status === 'paid' && updateData.paymentDate) {
      const employee = await this.employeeRepo.findById(payroll.employeeId.toString());
      if (employee && employee.employmentStatus === 'active') {
        const nextDate = calculateNextPayDate(updateData.paymentDate, employee.salaryInfo.payFrequency);
        if (!employee.nextPayDate || nextDate > employee.nextPayDate) {
          await this.employeeRepo.updateById(employee._id.toString(), { nextPayDate: nextDate });
        }
      }
    }
    return payroll;
  }

  async batchUpdate(input: BatchUpdateInput): Promise<{ matchedCount: number; modifiedCount: number }> {
    const { payrollIds, status, paymentMethod, transactionReference, notes, paymentDate } = input;
    if (!payrollIds.length) throw new AppError('payrollIds array is required', 400);
    // Validate IDs
    const invalidIds = payrollIds.filter(id => !Types.ObjectId.isValid(id));
    if (invalidIds.length) throw new AppError(`Invalid payroll IDs: ${invalidIds.join(', ')}`, 400);

    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (transactionReference) updateData.transactionReference = transactionReference;
    if (notes) updateData.notes = notes;
    if (paymentDate) updateData.paymentDate = paymentDate;

    const result = await this.payrollRepo.updateMany({ _id: { $in: payrollIds } }, updateData);

    // If status set to 'paid', update nextPayDate for each employee
    if (status === 'paid') {
      const payrolls = await this.payrollRepo.findWithPopulations(
        { _id: { $in: payrollIds } },
        { populate: ['employeeId'] }
      );
      for (const payroll of payrolls) {
        const employee = payroll.employeeId as any;
        if (employee && employee.employmentStatus === 'active' && payroll.paymentDate) {
          const nextDate = calculateNextPayDate(payroll.paymentDate, employee.salaryInfo.payFrequency);
          if (!employee.nextPayDate || nextDate > employee.nextPayDate) {
            await this.employeeRepo.updateById(employee._id.toString(), { nextPayDate: nextDate });
          }
        }
      }
    }
    return result;
  }

  async cancelPayroll(id: string): Promise<IPayroll> {
    const payroll = await this.payrollRepo.updateById(id, { status: 'cancelled' });
    if (!payroll) throw new AppError('Payroll record not found', 404);
    return payroll;
  }

  async batchCancel(input: BatchCancelInput): Promise<{ cancelledCount: number; cancelledIds: string[]; nonCancellable: any[] }> {
    const { payrollIds, reason } = input;
    if (!payrollIds.length) throw new AppError('payrollIds array is required', 400);
    const invalidIds = payrollIds.filter(id => !Types.ObjectId.isValid(id));
    if (invalidIds.length) throw new AppError(`Invalid payroll IDs: ${invalidIds.join(', ')}`, 400);

    const payrolls = await this.payrollRepo.findAll({ _id: { $in: payrollIds } });
    if (!payrolls.data.length) throw new AppError('No payroll records found', 404);

    const cancellableIds: string[] = [];
    const nonCancellable: { id: string; status: string }[] = [];
    for (const payroll of payrolls.data) {
      if (payroll.status === 'pending') {
        cancellableIds.push(payroll._id.toString());
      } else {
        nonCancellable.push({ id: payroll._id.toString(), status: payroll.status });
      }
    }
    if (cancellableIds.length === 0) {
      throw new AppError('No pending payroll records to cancel', 400);
    }

    const updateData: any = { status: 'cancelled', notes: reason ? `Cancelled: ${reason}` : 'Cancelled via batch operation' };
    const result = await this.payrollRepo.updateMany({ _id: { $in: cancellableIds } }, updateData);
    return { cancelledCount: result.modifiedCount, cancelledIds: cancellableIds, nonCancellable };
  }
}