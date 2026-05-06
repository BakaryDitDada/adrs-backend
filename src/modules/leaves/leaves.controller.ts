// src/modules/leaves/leaves.controller.ts
import { Request, Response, NextFunction } from 'express';
import { LeavesService } from './leaves.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { Types } from 'mongoose';

export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  create = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const userId = req.user._id;
    const { employeeId, type, startDate, endDate, reason, status } = req.body;
    const leave = await this.leavesService.createLeaveRequest({
      employeeId: new Types.ObjectId(employeeId),
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status,
      createdBy: userId,
    });
    res.status(201).json({ status: 'success', data: { leaveRequest: leave } });
  });

  createMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { leaves } = req.body;

    if (!leaves || !Array.isArray(leaves) || leaves.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No leaves provided for bulk creation',
      });
    }

    // Normalize each project’s ObjectId fields
    const normalizedProjects = leaves.map((project: any) => ({
      ...project,
      employeeId: project.employeeId ? new Types.ObjectId(project.employeeId) : undefined,
      approvedBy: project.approvedBy ? new Types.ObjectId(project.approvedBy) : undefined,
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      endDate: project.endDate ? new Date(project.endDate) : undefined,
      createdBy: req.user._id,
    }))

    const result = await this.leavesService.createLeaveRequests(
      { leaves: normalizedProjects }, // matches ProjectBulkCreateInput
      req.user._id   // audit userId from auth middleware
    );

    res.status(201).json({
      status: 'success',
      count: result.length,
      data: { leaves: result },
    });
  });

  getAll = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const { employeeId, status, fromDate, toDate, page, limit } = req.query;
    const filter = {
      employeeId: employeeId as string,
      status: status as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    };
    const result = await this.leavesService.getLeaveRequests(filter);
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: {
        leaveRequests: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  });

  advancedList = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;
    delete filters.sort;
    delete filters.search;

    const result = await this.leavesService.advancedListLeaves(filters, {
      page,
      limit,
      sort,
      search,
    });

    res.status(200).json({
      status: "success",
      results: result.docs.length,
      pagination: {
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalPerPage: result.totalPerPage,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      },
      data: result.docs,
    });
  });

  getLeavesByEmployee = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await this.leavesService.findByEmployeeId((id as any), {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: "-createdAt"
    });

    res.status(200).json({
      status: "success",
      ...result
    });
  });

  getOne = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const leave = await this.leavesService.getLeaveById(req.params.id);
    res.status(200).json({ status: 'success', data: { leaveRequest: leave } });
  });

  update = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const updated = await this.leavesService.updateLeaveRequest(
      req.params.id,
      req.body,
      userId,
      userRole
    );
    res.status(200).json({ status: 'success', data: { leaveRequest: updated } });
  });

  updateMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { leaves } = req.body;

    if (!leaves || !Array.isArray(leaves) || leaves.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No leave requests provided for bulk update",
      });
    }

    // Normalize each leave update
    const normalizedUpdates = leaves.map((leave: any) => {
      const updates: any = { ...leave };

      // ✅ Ensure _id is preserved
      updates._id = leave._id;

      if (updates.employeeId) {
        updates.employeeId = new Types.ObjectId(updates.employeeId);
      }
      if (updates.approvedBy) {
        updates.approvedBy = new Types.ObjectId(updates.approvedBy);
      }
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }
      if (updates.approvedAt) {
        updates.approvedAt = new Date(updates.approvedAt);
      }

      updates.updatedBy = req.user._id;
      updates.updatedAt = new Date();

      return updates;
    });

    // Perform updates one by one (to preserve per-leave logic)
    const results = await Promise.all(
      normalizedUpdates.map((update: any) =>
        this.leavesService.updateLeaveRequest(update._id, update, req.user._id, req.user.role)
      )
    );

    res.status(200).json({
      status: "success",
      count: results.length,
      data: { leaveRequests: results },
    });
  });

  approve = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const { id } = req.params;
    const userId = req.user._id;
    const result = await this.leavesService.approveLeaveRequest(id, req.body, userId);
    const message = result.status === 'Approuvé' ? 'Leave request approved' : 'Leave request rejected';
    res.status(200).json({ status: 'success', message, data: { leaveRequest: result } });
  });

  cancel = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const cancelled = await this.leavesService.cancelLeaveRequest(req.params.id, userId, userRole);
    res.status(200).json({ status: 'success', message: 'Leave request cancelled', data: { leaveRequest: cancelled } });
  });

  cancelMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { ids } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No leave request ids provided",
      });
    }

    const cancelledLeaves = await this.leavesService.cancelLeaveRequests(ids, userId, userRole);

    res.status(200).json({
      status: "success",
      count: cancelledLeaves.length,
      message: "Leave requests cancelled",
      data: { leaveRequests: cancelledLeaves },
    });
  });

  hardDelete = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    const userRole = req.user.role;
    await this.leavesService.hardDeleteLeaveRequest(req.params.id, userRole);
    res.status(200).json({ status: 'success', message: 'Leave request permanently deleted' });
  });

  hardDeleteMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { ids } = req.body;
    const userRole = req.user.role;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No leave request ids provided",
      });
    }

    await this.leavesService.hardDeleteLeaveRequests(ids, userRole);

    res.status(200).json({
      status: "success",
      message: "Leave requests permanently deleted",
    });
  });
}