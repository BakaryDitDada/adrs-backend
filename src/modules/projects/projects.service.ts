import { PopulateOptions, Types } from 'mongoose';
import { ProjectRepository } from './projects.repository.js';
import { DocumentService } from '../documents/docs.service.js';
import { ProjectCreateInput, ProjectUpdateInput, ProjectFilter } from './projects.types.js';
import { ProjectBulkCreateInput } from './projects.validation.js';
import AppError from '../../utils/appError.js';
import { IProject } from './projects.model.js';
import { BaseService } from '../base/base.service.js';

export class ProjectService extends BaseService<IProject> {
  constructor(
    private repo: ProjectRepository,
    private documentService: DocumentService
  ) {
    super(repo)
  }

  async createProject(data: ProjectCreateInput): Promise<IProject> {
    const existing = await this.repo.findByCode(data.code);
    if (existing) throw new AppError('Project code already exists', 400);
    return this.repo.create(data);
  }

  async createProjects(data: ProjectBulkCreateInput, userId: string): Promise<IProject[]> {
    const userIdObj = new Types.ObjectId(userId);

    const projectsWithAudit = data.projects.map(project => ({
      ...project,
      createdBy: userIdObj,
      updatedBy: userIdObj,
    }));

    try {
      return await this.repo.model.insertMany(projectsWithAudit, { ordered: false });
    } catch(err: any) {
      throw new AppError(`Bulk project creation failed: ${err.message}`, 500);
    }
  
  }

  async getProjects(filter: ProjectFilter) {
    const { status, manager, fromDate, toDate, page = 1, limit = 10 } = filter;
    const query: any = {};
    if (status) query.status = status;
    if (manager) query.manager = manager;
    if (fromDate || toDate) {
      query.startDate = {}
      if (fromDate) query.startDate.$gte = fromDate;
      if (toDate) query.startDate.$lte = toDate;
    }
    // if (fromDate) query.startDate = { $gte: fromDate };
    // if (toDate) query.startDate = { $lte: toDate }; 

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.repo.findWithPopulations(query, {
        skip,
        limit,
        sort: { createdAt: -1 },
        populate: ['manager', 'teamMembers', 'tasks', 'attachments', 'createdBy'],
      }),
      this.repo.count(query),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };

  }

  async listProjects(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ) {
    // Define populate options PROGRAMMATICALLY (not from query string)
    const populateOptions: (string | PopulateOptions)[] = [
      { path: "manager", select: "firstName lastName employeeId" },
      { path: "createdBy", select: "username email" }
    ];

    // Use base repository's findAll which supports filter, pagination, sort, search, populate
    return this.repo.findAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["name", "description", "code"],
      populate: populateOptions,
    });
  }

  async getProjectById(id: string): Promise<IProject> {
    const project = await this.repo.findById(id);
    if (!project) throw new AppError('Project not found', 404);
    await this.repo.model.populate(project, 'manager teamMembers tasks attachments createdBy');
    return project;
  }

  async updateProject(id: string, updates: ProjectUpdateInput): Promise<IProject> {
    const project = await this.repo.updateById(id, updates);
    if (!project) throw new AppError('Project not found', 404);
    return project;
  }

  async softDeleteProject(id: string): Promise<void> {
    const project = await this.repo.findById(id);
    if (!project) throw new AppError('Project not found', 404);
    // Soft delete (model already has isDeleted and pre-find hook)
    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();
    // Optionally delete associated documents? Usually keep them.
  }

  async softDeleteProjects(ids: string[]): Promise<any> {
    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No project ids provided", 400);
    }

    await this.repo.model.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

  }

  async deleteProject(id: string): Promise<boolean> {
    const project = await this.repo.deleteById(id);
    return project;
  }

  async deleteProjects(ids: string[]): Promise<any> {
    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError("No project ids provided", 400);
    }

    await this.repo.deleteMany({
      _id: { $in: ids.map(id => new Types.ObjectId(id)) }
    })
    
  }

  async addAttachment(projectId: string, documentId: string): Promise<IProject> {
    const project = await this.repo.addAttachment(projectId, new Types.ObjectId(documentId));
    if (!project) throw new AppError('Project not found', 404);
    return project;
  }
 
  async removeAttachment(projectId: string, documentId: string): Promise<IProject> {
    const project = await this.repo.removeAttachment(projectId, new Types.ObjectId(documentId));
    if (!project) throw new AppError('Project not found', 404);
    // Also delete the document record itself? Usually we keep document for other references.
    // If you want to delete the document record, call documentService.deleteDocument.
    return project;
  }
}