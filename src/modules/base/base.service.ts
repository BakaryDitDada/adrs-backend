import { Document, UpdateQuery } from 'mongoose';
import { IBaseRepository } from './base.repository.js';
import AppError from '../../utils/appError.js';

export abstract class BaseService<T extends Document> {
  constructor(protected readonly repository: IBaseRepository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(data);
  }

  async getById(id: string, select?: string): Promise<T> {
    const doc = await this.repository.findById(id, select);
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
  }

  async getByEmail(email: string, select?: string): Promise<T> {
    const doc = await this.repository.findByEmail(email, select);
    if (!doc) throw new AppError('Document not found', 404);
    return doc;
  }

  async getOne(filter: any, select?: string): Promise<T | null> {
    return this.repository.findOne(filter, select);
  }

  async getAll(
    filter: any = {},
    pagination?: { page?: number; limit?: number; sort?: any; populate?: string[] }
  ) {
    return this.repository.findAll(filter, pagination);
  }

  async updateById(id: string, data: UpdateQuery<T>): Promise<T> {
    const updated = await this.repository.updateById(id, data);
    if (!updated) throw new AppError('Document not found', 404);
    return updated;
  }

  async updateMany(filter: any, updates: UpdateQuery<T>): Promise<any> {
    return this.repository.updateMany(filter, updates);
  }

  async deleteById(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new AppError('Document not found', 404);
  }

  async deleteMany(filter: any): Promise<number> {
    return this.repository.deleteMany(filter);
  }
}