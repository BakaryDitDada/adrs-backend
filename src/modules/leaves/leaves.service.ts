// src/modules/leaves/leaves.service.ts
import { PopulateOptions, Types, startSession } from 'mongoose';
import { LeavesRepository } from './leaves.repository.js';
import { EmployeeRepository } from '../employees/employees.repository.js';
import AppError from '../../utils/appError.js';
import {
  LeaveCreateInput,
  LeaveUpdateInput,
  LeaveApproveInput,
  LeaveFilter,
  LeaveBalance,
} from './leaves.types.js';

import { ILeave } from './leaves.model.js';
import { LeaveBulkCreateInput } from './leaves.validation.js';
import { PaginatedResult } from '@/types/pagination.js';

export class LeavesService {
  constructor(
    private leaveRepo: LeavesRepository,
    private employeeRepo: EmployeeRepository
  ) {}

  // private calculateDays(start: Date, end: Date): number {
  //   return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  // }
  private calculateDays(start: Date | string, end: Date | string): number {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
  }


  async createLeaveRequest(data: LeaveCreateInput): Promise<ILeave> {
    const { employeeId, type, startDate, endDate, reason, createdBy } = data;

    // Validate employee exists and is active
    const employee = await this.employeeRepo.findById(employeeId.toString());
    if (!employee || employee.isDeleted) {
      throw new AppError('Employee not found or inactive', 404);
    }

    if (startDate > endDate) {
      throw new AppError('Start date must be before end date', 400);
    }

    const days = this.calculateDays(startDate, endDate);

    // Check overlapping leave requests
    const overlapping = await this.leaveRepo.findOverlapping(employeeId, startDate, endDate);
    if (overlapping) {
      throw new AppError('Leave request overlaps with an existing request', 400);
    }

    // Check leave balance for paid types
    if (type === 'Annuel' && days > employee.leaveBalance.annual) {
      throw new AppError('Insufficient annual leave balance', 400);
    }
    if (type === 'Maladie' && days > employee.leaveBalance.sick) {
      throw new AppError('Insufficient sick leave balance', 400);
    }

    const leaveData: Partial<ILeave> = {
      employeeId,
      type,
      startDate,
      endDate,
      days,
      reason,
      status: 'En attente',
      createdBy,
    };

    const leave = await this.leaveRepo.create(leaveData);
    // Populate for response
    await this.leaveRepo.model.populate(leave, [
      { path: 'employeeId', select: 'firstName lastName employeeId' },
      { path: 'createdBy', select: 'username email' },
    ]);
    return leave;
  }

  async createLeaveRequests(data: LeaveBulkCreateInput, userId: string): Promise<ILeave[]> {
    const userIdObj = new Types.ObjectId(userId);

    const leavesWithAudit = data.leaves.map(leave => ({
      ...leave,
      createdBy: userIdObj,
      updatedBy: userIdObj,
    }));

    try {
      return await this.leaveRepo.model.insertMany(leavesWithAudit, { ordered: false });
    } catch(err: any) {
      throw new AppError(`Bulk Leave creation failed: ${err.message}`, 500);
    }
  
  }

  async getLeaveRequests(filter: LeaveFilter) {
    const { employeeId, status, fromDate, toDate, page = 1, limit = 10 } = filter;
    const query: any = {};
    if (employeeId && Types.ObjectId.isValid(employeeId)) query.employeeId = employeeId;
    if (status) query.status = status;
    if (fromDate) query.startDate = { $gte: fromDate };
    if (toDate) query.endDate = { $lte: toDate };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.leaveRepo.findWithPopulations(query, {
        skip,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: 'employeeId', select: 'firstName lastName workEmail position department'}, 
          { path: 'approvedBy', select: 'username email firstName lastName'}, 
          { path: 'createdBy', select: 'username email firstName lastName'}
        ],
      }),
      this.leaveRepo.count(query),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async advancedListLeaves(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ): Promise<PaginatedResult<ILeave>> {
    const populateOptions = [
      { path: 'employeeId', select: 'firstName lastName workEmail position department' },
      { path: 'approvedBy', select: 'username email firstName lastName'}, 
      { path: 'createdBy', select: 'username email firstName lastName'}
    ];

    return this.leaveRepo.advancedFindAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["type", "reason", "status"],
      populate: populateOptions,
    });
  }

  async getLeaveById(id: string): Promise<ILeave> {
    const leave = await this.leaveRepo.findById(id);
    if (!leave) throw new AppError('Leave request not found', 404);
    await this.leaveRepo.model.populate(leave, [
      { path: 'employeeId', select: 'firstName lastName employeeId department' },
      { path: 'approvedBy', select: 'username email' },
      { path: 'createdBy', select: 'username email' },
    ]);
    return leave;
  }

  /**
   * Find leaves requested by a specific employee
   */
  async findByEmployeeId(
    employeeId: string,
    options: {
      page?: number;
      limit?: number;
      sort?: string;
      fields?: string;
      populate?: (string | PopulateOptions)[];
    } = {}
  ): Promise<{ data: ILeave[]; total: number; page: number; limit: number }> {
    const filter = { employeeId };
    return this.leaveRepo.findAll(filter, {
      ...options,
      populate: [
        { path: 'employeeId', select: 'firstName lastName workEmail position department'}, 
        { path: 'approvedBy', select: 'username email firstName lastName'}, 
        { path: 'createdBy', select: 'username email firstName lastName'}
      ]
    });
  }

  async updateLeaveRequest(id: string, updateData: LeaveUpdateInput, userId: string, userRole: string): Promise<ILeave> {
    const leave = await this.leaveRepo.findById(id);
    if (!leave) throw new AppError('Leave request not found', 404);
    if (leave.status !== 'En attente') {
      throw new AppError(`Cannot update ${leave.status} request`, 400);
    }

    // Permissions: employee can only update own pending requests; managers/admins can update any pending
    const isEmployee = userRole === 'employee';
    const isManagerOrAdmin = ['admin', 'hr', 'manager'].includes(userRole);
    if (isEmployee && leave.createdBy.toString() !== userId) {
      throw new AppError('You can only update your own requests', 403);
    }
    if (!isEmployee && !isManagerOrAdmin) {
      throw new AppError('Insufficient permissions', 403);
    }

    const employee = await this.employeeRepo.findById(leave.employeeId.toString());
    if (!employee) throw new AppError('Employee not found', 404);

    let newStart = updateData.startDate || leave.startDate;
    let newEnd = updateData.endDate || leave.endDate;
    let newType = updateData.type || leave.type;
    let newDays = leave.days;

    if (updateData.startDate || updateData.endDate) {
      if (newStart > newEnd) throw new AppError('Start date must be before end date', 400);
      console.log("Start Date ::: ", newStart, " ", "End Date ::: ", newEnd);
      newDays = this.calculateDays(newStart, newEnd);
    }

    // Check overlap excluding this leave
    const overlapping = await this.leaveRepo.findOverlapping(leave.employeeId, newStart, newEnd, id);
    if (overlapping) throw new AppError('Updated dates overlap with an existing leave request', 400);

    // Balance validation for employees (managers can override via separate flag, not implemented here for simplicity)
    if (isEmployee && (newType === 'Annuel' || newType === 'Maladie')) {
      const balanceKey = newType === 'Annuel' ? 'Annuel' : 'Maladie';
      if (newDays > (employee.leaveBalance as any)[balanceKey]) {
        throw new AppError(`Insufficient ${newType} leave balance`, 400);
      }
    }

    const updatePayload: any = {};
    if (updateData.type) updatePayload.type = newType;
    if (updateData.startDate) updatePayload.startDate = newStart;
    if (updateData.endDate) updatePayload.endDate = newEnd;
    if (updateData.reason) updatePayload.reason = updateData.reason;
    if (newDays !== leave.days) updatePayload.days = newDays;

    const updated = await this.leaveRepo.updateById(id, updatePayload);
    if (!updated) throw new AppError('Failed to update leave request', 500);

    await this.leaveRepo.model.populate(updated, [
      { path: 'employeeId', select: 'firstName lastName employeeId' },
      { path: 'createdBy', select: 'username email' },
    ]);
    return updated;
  }

  async approveLeaveRequest(id: string, input: LeaveApproveInput, approverId: string): Promise<ILeave> {
    const { approve, overrideBalance = false, rejectionReason } = input;
    const leave = await this.leaveRepo.findPendingById(id);
    if (!leave) throw new AppError('Leave request not found or already processed', 404);

    const employee = await this.employeeRepo.findById(leave.employeeId.toString());
    if (!employee) throw new AppError('Employee not found', 404);

    const session = await startSession();
    session.startTransaction();

    try {
      if (approve === true) {
        // Handle paid leave types
        if (leave.type === 'Annuel' || leave.type === 'Maladie') {
          const balanceKey = leave.type === 'Annuel' ? 'Annuel' : 'Maladie';
          if (!overrideBalance && leave.days > (employee.leaveBalance as any)[balanceKey]) {
            throw new AppError(`Insufficient ${leave.type} leave balance`, 400);
          }
          (employee.leaveBalance as any)[balanceKey] -= leave.days;
        } else if (leave.type === 'Non payé') {
          employee.leaveBalance.unpaid = (employee.leaveBalance.unpaid || 0) + leave.days;
        }
        await employee.save({ session });

        leave.status = 'Approuvé';
        leave.approvedBy = new Types.ObjectId(approverId);
        leave.approvedAt = new Date();
      } else if (approve === false) {
        leave.status = 'Rejeté';
        leave.approvedBy = new Types.ObjectId(approverId);
        leave.approvedAt = new Date();
        if (rejectionReason) leave.rejectionReason = rejectionReason;
      } else {
        throw new AppError('Missing or invalid approve flag (true/false)', 400);
      }

      await leave.save({ session });
      await session.commitTransaction();

      await this.leaveRepo.model.populate(leave, [
        { path: 'employeeId', select: 'firstName lastName employeeId' },
        { path: 'approvedBy', select: 'username email' },
      ]);
      return leave;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancelLeaveRequest(id: string, userId: string, userRole: string): Promise<ILeave> {
    const leave = await this.leaveRepo.findById(id);
    if (!leave) throw new AppError('Leave request not found', 404);
    if (leave.status !== 'En attente') {
      throw new AppError(`Cannot cancel ${leave.status} request`, 400);
    }
    // Only the creator or admin/hr can cancel
    const isCreator = leave.createdBy.toString() === userId;
    const isAuthorized = isCreator || ['admin', 'hr'].includes(userRole);
    if (!isAuthorized) throw new AppError('Not authorized to cancel this request', 403);

    leave.status = 'Annulé';
    await leave.save();
    return leave;
  }

  async cancelLeaveRequests(ids: string[], userId: string, userRole: string): Promise<ILeave[]> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No leave request ids provided", 400);
    }

    const leaves = await this.leaveRepo.model.find({ _id: { $in: ids } });

    if (!leaves || leaves.length === 0) {
      throw new AppError("No leave requests found", 404);
    }

    const updatedLeaves: ILeave[] = [];

    for (const leave of leaves) {
      if (leave.status !== "En attente") {
        // skip or throw depending on your business rules
        continue;
      }

      const isCreator = leave.createdBy.toString() === userId;
      const isAuthorized = isCreator || ["admin", "hr"].includes(userRole);
      if (!isAuthorized) {
        continue; // or throw if you want strict enforcement
      }

      leave.status = "Annulé";
      leave.updatedAt = new Date();
      await leave.save();
      updatedLeaves.push(leave);
    }

    return updatedLeaves;
  }

  async hardDeleteLeaveRequest(id: string, userRole: string): Promise<void> {
    if (userRole !== 'admin') throw new AppError('Admin permission required', 403);
    const leave = await this.leaveRepo.findById(id);
    if (!leave) throw new AppError('Leave request not found', 404);

    // TO CHECK IF THIS LOGIC IS NECESSARY
    if (leave.status !== 'En attente') {
      throw new AppError(`Cannot delete ${leave.status} request`, 400);
    }
    await this.leaveRepo.deleteById(id);
  }

  async hardDeleteLeaveRequests(ids: string[], userRole: string): Promise<void> {
    if (userRole !== "admin") throw new AppError("Admin permission required", 403);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No leave request ids provided", 400);
    }

    const leaves = await this.leaveRepo.model.find({ _id: { $in: ids } });

    if (!leaves || leaves.length === 0) {
      throw new AppError("No leave requests found", 404);
    }

    const pendingIds = leaves
      .filter(l => l.status === "En attente")
      .map(l => l._id);

    if (pendingIds.length === 0) {
      throw new AppError("No pending leave requests eligible for deletion", 400);
    }

    await this.leaveRepo.deleteMany({ _id: { $in: pendingIds } });
  }

}