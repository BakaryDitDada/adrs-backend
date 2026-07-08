import { NextFunction, Request, Response } from 'express';
import { TaskService } from './tasks.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { Types } from 'mongoose';

export class TaskController {
  constructor(private service: TaskService) {}

  create = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    const taskData = {
      ...req.body,
      assignedTo: req.body.assignedTo?.map((id: string) => new Types.ObjectId(id)),
      categories: req.body.categories ? req.body.categories?.split(',').map((id: string) => new Types.ObjectId(id)) : undefined,
      projectId: req.body.projectId ? new Types.ObjectId(req.body.projectId) : undefined,
      startDate: new Date(req.body.startDate),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      createdBy: req.user._id,
    };

    const task = await this.service.createTask(taskData);
    res.status(201).json({ status: 'success', data: { task } });
  });

  createMany = catchAsync(async (req: Request | any, res: Response | any, _next: NextFunction) => {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No tasks provided for bulk creation',
      });
    }

    // Normalize each project’s ObjectId fields
    const normalizedProjects = tasks.map((task: any) => ({
      ...task,
      projectId: task.projectId ? new Types.ObjectId(task.projectId) : undefined,
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo.map((id: string) => new Types.ObjectId(id)) : [],
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      endDate: task.dueDate ? new Date(task.dueDate) : undefined,
      createdBy: req.user._id,
    }))

    const result = await this.service.createTasks(
      { tasks: normalizedProjects }, // matches ProjectBulkCreateInput
      req.user._id   // audit userId from auth middleware
    );

    res.status(201).json({
      status: 'success',
      count: result.length,
      data: { projects: result },
    });
  });

  getAll = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const { status, assignedTo, projectId, fromDate, toDate, page, limit } = req.query;
    const result = await this.service.getTasks({
      status: status as string,
      assignedTo: assignedTo as string,
      projectId: projectId as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: {
        tasks: result.data,
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

    const result = await this.service.advancedListTasks(filters, {
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

  getTasksByEmployee = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const { page, limit } = req.query;

    const result = await this.service.findByAssignedEmployee((id as any), {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      sort: "-createdAt"
    });

    res.status(200).json({
      status: "success",
      ...result
    });
  });

  getById = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    const task = await this.service.getTaskById(req.params.id);
    res.status(200).json({ status: 'success', data: task });
  });

  update = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    const updates = { ...req.body };
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    const task = await this.service.updateTask(req.params.id, updates);
    res.status(200).json({ status: 'success', data: { task } });
  });

  updateMany = catchAsync(async (req: Request | any, res: Response | any, _next: NextFunction) => {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No tasks provided for bulk update',
      });
    }

    // Normalize each project update
    const normalizedUpdates = tasks.map((task: any) => {
      const updates: any = { ...task };

      // ✅ Ensure _id is preserved
      updates._id = task._id;  

      if (updates.projectId) updates.projectId = new Types.ObjectId(updates.projectId);
      if (Array.isArray(updates.assignedTo)) {
        updates.assignedTo = updates.assignedTo.map((id: string) => new Types.ObjectId(id));
      }
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

      updates.updatedBy = req.user._id;
      updates.updatedAt = new Date();

      return updates;
    });

    // Perform updates one by one (to preserve per-project logic)
    const results = await Promise.all(
      normalizedUpdates.map((update: any) =>
        this.service.updateTask(update._id, update)
      )
    );

    res.status(200).json({
      status: 'success',
      count: results.length,
      data: { projects: results },
    });
  });

  delete = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    await this.service.deleteTask(req.params.id);
    res.status(204).send();
  });

  softDelete = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    await this.service.softDeleteTask(req.params.id);

    res.status(204).send();
  })

  deleteMany = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    await this.service.deleteTasks(req.body.ids);

    res.status(204).send();
  })

  softDeleteMany = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    await this.service.softDeleteTasks(req.params.ids);

    res.status(204).send();
  })

  addAttachment = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    const { documentId } = req.body;
    const task = await this.service.addAttachment(req.params.id, documentId);
    res.status(200).json({ status: 'success', data: { task } });
  });

  removeAttachment = catchAsync(async (req: Request | any, res: Response, _next: NextFunction) => {
    const task = await this.service.removeAttachment(req.params.id, req.params.documentId);
    res.status(200).json({ status: 'success', data: { task } });
  });
}