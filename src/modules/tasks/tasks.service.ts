import { PopulateOptions, Types } from 'mongoose';
import { TaskRepository } from './tasks.repository.js';
import { ProjectRepository } from '../projects/projects.repository.js';
import { DocumentService } from '../documents/docs.service.js';
import { TaskBulkCreateInput } from './tasks.validation.js';

import { sendTaskAssignmentEmails } from '../../services/email.service.js';

import { TaskCreateInput, TaskUpdateInput, TaskFilter } from './tasks.types.js';
import AppError from '../../utils/appError.js';
import { TTask } from './tasks.model.js';
import { PaginatedResult } from '@/types/pagination.js';

export class TaskService {
  private sendTaskAssignmentEmails: typeof sendTaskAssignmentEmails;

  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private documentService: DocumentService,
  ) {
    this.sendTaskAssignmentEmails = sendTaskAssignmentEmails; // Inject email function
  }

  // async createTask(data: TaskCreateInput): Promise<TTask> {
  //   const task = await this.taskRepo.create(data);
  //   // If task belongs to a project, add task ID to project's tasks array
  //   if (data.projectId) {
  //     await this.projectRepo.model.findByIdAndUpdate(data.projectId, { $addToSet: { tasks: task._id } });
  //   }
  //   // Send email notifications to assigned users (optional)
  //   if (data.assignedTo?.length) {
  //     // Populate assignedTo emails – we'll do after save or using lean.
  //     const populated: any = await this.taskRepo.model.populate(task, { path: 'assignedTo', select: 'email firstName lastName' });

  //     await this.sendTaskAssignmentEmails(populated, task)

  //     // for (const user of (populated as any).assignedTo) {
  //     //   await this.sendTaskAssignmentEmails(user.email, user.firstName, task);
  //     // }
  //   }
  //   return task;
  // }

  async createTask(data: TaskCreateInput): Promise<TTask> {
    // return console.log("Data (createTask) ::: ", data);
    const task = await this.taskRepo.create(data);


    // If task belongs to a project, add task ID to project's tasks array
    if (data.projectId) {
      await this.projectRepo.model.findByIdAndUpdate(
        data.projectId,
        { $addToSet: { tasks: task._id } }
      );
    }

    // Send email notifications to assigned users
    if (data.assignedTo?.length) {
      // Populate assignedTo with email + names
      const populated: any = await this.taskRepo.model.populate(task, {
        path: "assignedTo",
        select: "workEmail firstName lastName"
      });

      // Map into the format expected by sendTaskAssignmentEmails
      const employees = (populated.assignedTo || []).map((emp: any) => ({
        email: emp.workEmail,
        firstName: emp.firstName,
        lastName: emp.lastName
      }));

      await this.sendTaskAssignmentEmails(employees, task);
    }

    return task;
  }

  async createTasks(data: TaskBulkCreateInput, userId: string): Promise<TTask[]> {
    const userIdObj = new Types.ObjectId(userId);

    const tasksWithAudit = data.tasks.map(task => ({
      ...task,
      createdBy: userIdObj,
      updatedBy: userIdObj,
    }));

    try {
      return await this.taskRepo.model.insertMany(tasksWithAudit, { ordered: false });
    } catch(err: any) {
      throw new AppError(`Bulk project creation failed: ${err.message}`, 500);
    }
  
  }

  async getTasks(filter: TaskFilter) {
    const { status, assignedTo, projectId, fromDate, toDate, page = 1, limit = 10 } = filter;
    const query: any = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (projectId) query.projectId = projectId;
    if (fromDate) query.startDate = { $gte: fromDate };
    if (toDate) query.startDate = { $lte: toDate };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.taskRepo.findWithPopulations(query, {
        skip,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: "assignedTo", select: "firstName lastName workEmail" },
          { path: "projectId", select: "name code status" },
          { path: "attachments", select: "filename originalName size path " },
          { path: "createdBy", select: "username email" }
        ],
      }),
      this.taskRepo.count(query),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async advancedListTasks(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ): Promise<PaginatedResult<TTask>> {
    const populateOptions = [
      { path: "assignedTo", select: "firstName lastName workEmail" },
      { path: "projectId", select: "name code status" },
      { path: "attachments", select: "filename originalName size path " },
      { path: "createdBy", select: "username email" }
    ];

    return this.taskRepo.advancedFindAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["title", "description", "type", "status", "priority"],
      populate: populateOptions,
    });
  }

  /**
   * Find tasks assigned to a specific employee
   */
  async findByAssignedEmployee(
    employeeId: string,
    options: {
      page?: number;
      limit?: number;
      sort?: string;
      fields?: string;
      populate?: (string | PopulateOptions)[];
    } = {}
  ): Promise<{ data: TTask[]; total: number; page: number; limit: number }> {
    const filter = { assignedTo: employeeId };
    return this.taskRepo.findAll(filter, {
      ...options,
      populate: [
        { path: "assignedTo", select: "firstName lastName workEmail" },
        { path: "attachments", select: "originalName downloadUrl path size" },
        { path: "projectId", select: "name code status" }
      ]
    });
  }

  async getTaskById(id: string): Promise<TTask> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new AppError('Task not found', 404);
    await this.taskRepo.model.populate(task, [
        { path: "assignedTo", select: "firstName lastName workEmail" },
        { path: "projectId", select: "name code status" },
        { path: "attachments", select: "filename originalName size path " },
        { path: "createdBy", select: "username email" }
      ],
    );
    // await this.taskRepo.model.populate(task, 'assignedTo projectId categories attachments createdBy');
    return task;
  }

  async updateTask(id: string, updates: TaskUpdateInput): Promise<TTask> {
    // If status is changed to 'Terminé', set percentage to 100 and completionDate
    if (updates.status === 'Terminé') {
      updates.percentage = 100;
      (updates as any).completionDate = new Date();
    }
    const task = await this.taskRepo.updateById(id, updates);
    if (!task) throw new AppError('Task not found', 404);
    return task;
  }

  async softDeleteTask(id: string): Promise<void> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new AppError('Task not found', 404);
    // Soft delete
    task.isDeleted = true;
    task.deletedAt = new Date();
    await task.save();
    // Optionally remove from project's tasks list
    if (task.projectId) {
      await this.projectRepo.model.findByIdAndUpdate(task.projectId, { $pull: { tasks: task._id } });
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    const task = await this.taskRepo.deleteById(id);
    return task;
  }

  async softDeleteTasks(ids: string[]): Promise<any> {
    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No project ids provided", 400);
    }

    await this.taskRepo.model.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

  }

  async deleteTasks(ids: string[]): Promise<any> {
    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No tasks ids provided", 400);
    }

    await this.taskRepo.deleteMany({
      _id: { $in: ids.map(id => new Types.ObjectId(id)) }
    })
    
  }

  async addAttachment(taskId: string, documentId: string): Promise<TTask> {
    const task = await this.taskRepo.addAttachment(taskId, new Types.ObjectId(documentId));
    if (!task) throw new AppError('Task not found', 404);
    return task;
  }

  async removeAttachment(taskId: string, documentId: string): Promise<TTask> {
    const task = await this.taskRepo.removeAttachment(taskId, new Types.ObjectId(documentId));
    if (!task) throw new AppError('Task not found', 404);
    return task;
  }
}