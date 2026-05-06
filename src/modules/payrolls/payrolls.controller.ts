// src/modules/payroll/payroll.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payrolls.service.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  createPayrollBatch = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const { employeeIds, payPeriodStart, payPeriodEnd, paymentDate, customData } = req.body;
    const creatorId = req.user?._id;

    const start = new Date(payPeriodStart);
    const end = new Date(payPeriodEnd);
    const payment = new Date(paymentDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(payment.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    const { createdPayrolls, errors } = await this.payrollService.createPayrollBatch(
      employeeIds,
      start,
      end,
      payment,
      customData || {},
      creatorId
    );

    res.status(201).json({
      status: 'success',
      data: { payrolls: createdPayrolls },
      errors: errors.length ? errors : undefined,
    });
  });

  getAllPayrolls = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { employeeId, status, fromDate, toDate, page, limit } = req.query;
    const filter = {
      employeeId: employeeId as string,
      status: status as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    };

    const result = await this.payrollService.getPayrolls(filter);

    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: {
        payrolls: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  });

  getPayroll = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const payroll = await this.payrollService.getPayrollById(req.params.id);
    res.status(200).json({ status: 'success', data: { payroll } });
  });

  updatePayroll = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const updated = await this.payrollService.updatePayroll(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { payroll: updated } });
  });

  batchUpdate = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const result = await this.payrollService.batchUpdate(req.body);
    res.status(200).json({ status: 'success', data: result });
  });

  cancelPayroll = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const cancelled = await this.payrollService.cancelPayroll(req.params.id);
    res.status(200).json({ status: 'success', message: 'Payroll cancelled', data: { payroll: cancelled } });
  });

  batchCancel = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const result = await this.payrollService.batchCancel(req.body);
    res.status(200).json({ status: 'success', data: result });
  });
}