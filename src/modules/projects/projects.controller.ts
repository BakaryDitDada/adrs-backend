import { NextFunction, Request, Response } from 'express';
import { ProjectService } from './projects.service.js';
import catchAsync from '../../utils/catchAsync.js';
import { Types } from 'mongoose';

export class ProjectController {
  constructor(private service: ProjectService) {}

  create = catchAsync(async (req: Request | any, res: Response) => {
    const projectData = {
      ...req.body,
      manager: new Types.ObjectId(req.body.manager),
      teamMembers: req.body.teamMembers?.map((id: string) => new Types.ObjectId(id)),
      tasks: req.body.tasks?.map((id: string) => new Types.ObjectId(id)),
      attachments: req.body.attachments?.map((id: string) => new Types.ObjectId(id)),
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      createdBy: req.user._id,
    };

    const project = await this.service.createProject(projectData);
    res.status(201).json({ status: 'success', data: { project } });
  });

   // --- Bulk Create Projects ---
  createMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { projects } = req.body;

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No projects provided for bulk creation',
      });
    }

    // Normalize each project’s ObjectId fields
    const normalizedProjects = projects.map((project: any) => ({
      ...project,
      manager: project.manager ? new Types.ObjectId(project.manager) : undefined,
      teamMembers: Array.isArray(project.teamMembers) ? project.teamMembers.map((id: string) => new Types.ObjectId(id)) : [],
      tasks: Array.isArray(project.tasks) ? project.tasks.map((id: string) => new Types.ObjectId(id)) : [],
      attachments: Array.isArray(project.attachments) ? project.attachments.map((id: string) => new Types.ObjectId(id)) : [],
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      endDate: project.endDate ? new Date(project.endDate) : undefined,
      createdBy: req.user._id,
    }))

    const result = await this.service.createProjects(
      { projects: normalizedProjects }, // matches ProjectBulkCreateInput
      req.user._id   // audit userId from auth middleware
    );

    res.status(201).json({
      status: 'success',
      count: result.length,
      data: { projects: result },
    });
  });

  getAll = catchAsync(async (req: Request, res: Response) => {
    const { status, manager, fromDate, toDate, page, limit } = req.query;
    const result = await this.service.getProjects({
      status: status as string,
      manager: manager as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: {
        projects: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    });
  }); 

  list = catchAsync(async (req: Request, res: Response, _: NextFunction) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    // Filters from query (e.g., ?department=Engineering)
    const filters = { ...req.query };
    const excluded = ["page", "limit", "sort", "search"];
    excluded.forEach(key => delete filters[key]);

    const result = await this.service.listProjects(filters, { page, limit, sort, search });

    res.status(200).json({
      status: "success",
      results: result.data.length,

      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.data,
    });
  });

  getOne = catchAsync(async (req: Request | any, res: Response) => {
    const project = await this.service.getProjectById(req.params.id);
    res.status(200).json({ status: 'success', data: { project } });
  });

  update = catchAsync(async (req: Request | any, res: Response) => {
    const updates = { ...req.body };
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    if (Array.isArray(updates.teamMembers)) updates.teamMembers = updates.teamMembers.map((id: string) => new Types.ObjectId(id));
    if (Array.isArray(updates.tasks)) updates.tasks = updates.tasks.map((id: string) => new Types.ObjectId(id));
    if (Array.isArray(updates.attachments)) updates.attachments = updates.attachments.map((id: string) => new Types.ObjectId(id));

    updates.updatedBy = req.user._id;
    updates.updatedAt = new Date();

    const project = await this.service.updateProject(req.params.id, updates);

    res.status(200).json({ status: 'success', data: { project } });

  });

  updateMany = catchAsync(async (req: Request | any, res: Response | any) => {
    const { projects } = req.body;

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No projects provided for bulk update',
      });
    }

    // Normalize each project update
    const normalizedUpdates = projects.map((project: any) => {
      const updates: any = { ...project };

      // ✅ Ensure _id is preserved
      updates._id = project._id;  

      if (updates.manager) updates.manager = new Types.ObjectId(updates.manager);
      if (Array.isArray(updates.teamMembers)) {
        updates.teamMembers = updates.teamMembers.map((id: string) => new Types.ObjectId(id));
      }
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);

      updates.updatedBy = req.user._id;
      updates.updatedAt = new Date();

      return updates;
    });

    // Perform updates one by one (to preserve per-project logic)
    const results = await Promise.all(
      normalizedUpdates.map((update: any) =>
        this.service.updateProject(update._id, update)
      )
    );

    res.status(200).json({
      status: 'success',
      count: results.length,
      data: { projects: results },
    });
  });

  delete = catchAsync(async (req: Request | any, res: Response) => {
    await this.service.deleteProject(req.params.id);
    res.status(204).send();
  });

  softDelete = catchAsync(async (req: Request | any, res: Response) => {
    await this.service.softDeleteProject(req.params.id);
    res.status(204).send();
  });

  deleteMany = catchAsync(async (req: Request | any, res: Response) => {
    await this.service.deleteProjects(req.body.ids);

    res.status(204).send();
  })

  softDeleteMany = catchAsync(async (req: Request | any, res: Response) => {
    await this.service.softDeleteProjects(req.body.ids);

    res.status(204).send();
  })

  addAttachment = catchAsync(async (req: Request | any, res: Response) => {
    const { documentId } = req.body;
    const project = await this.service.addAttachment(req.params.id, documentId);
    res.status(200).json({ status: 'success', data: { project } });
  });

  removeAttachment = catchAsync(async (req: Request | any, res: Response) => {
    const project = await this.service.removeAttachment(req.params.id, req.params.documentId);
    res.status(200).json({ status: 'success', data: { project } });
  });
}