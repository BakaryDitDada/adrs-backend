import { Model, Document, UpdateQuery, PopulateOptions } from 'mongoose';
import APIFeatures from '../../utils/apiFeatures.js';
import { PaginatedResult } from '@/types/pagination.js';

export interface IBaseRepository<T extends Document> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string, select?: string): Promise<T | null>;
  findByEmail(email: string, select?: string): Promise<T | null>;
  findOne(filter: any, select?: string): Promise<T | null>;
  findAll(
    filter: any,
    options?: {
      page?: number;
      limit?: number;
      sort?: string;
      fields?: string;
      search?: string;
      searchFields?: string[];
      populate?: (string | PopulateOptions)[];
    }
  ): Promise<{ data: T[]; total: number; page: number; limit: number }>;
  updateById(id: string, data: UpdateQuery<T>): Promise<T | null>;
  updateMany(filter: any, updates: UpdateQuery<T>): Promise<any>;
  deleteById(id: string): Promise<boolean>;
  deleteMany(filter: any): Promise<number>;
}

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async insertMany(data: Partial<T>[]): Promise<T[]> {
    const docs = await this.model.insertMany(data);
    return docs as unknown as T[];
  }

  async findById(id: string, select?: string): Promise<T | null> {
    let query: any = this.model.findById(id);
    if (select) query = query.select(select);
    return query.exec();
  }

  async findByEmail(email: string, select?: string): Promise<T | null> {
    let query: any = this.model.findOne({ email });
    if (select) query = query.select(select);
    return query.exec();
  }

  async findOne(filter: any, select?: string): Promise<T | null> {
    let query: any = this.model.findOne(filter);
    if (select) query = query.select(select);
    return query.exec();
  }

  async updateOne(filter: any, updates: any): Promise<any> {
    return this.model.updateOne(filter, updates);
  }

  async updateMany(filter: any, updates: any): Promise<any> {
    return this.model.updateMany(
      { ...filter },
      updates,
      { runValidators: true }
    );
  }

  async findAll(
    filter: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: string;
      fields?: string;
      search?: string;
      searchFields?: string[];
      populate?: (string | PopulateOptions)[];
    } = {}
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    // Build queryString object for APIFeatures (only pagination, sort, fields, search)
    const queryString: any = {
      page: options.page?.toString() || '1',
      limit: options.limit?.toString() || '10',
    };
    if (options.sort) queryString.sort = options.sort;
    if (options.fields) queryString.fields = options.fields;
    if (options.search) queryString.search = options.search;

    // Create APIFeatures instance with the base query, queryString, and populate options
    const features = new APIFeatures(this.model.find(filter), queryString, options.populate)
      .filter()       // applies filters from queryString (if any)
      .sort()
      .limitFields()
      .paginate();

    // Apply search if searchFields are provided
    if (options.search && options.searchFields) {
      features.search(options.searchFields);
    }

    // Apply population (passed via constructor) – this is where populate is applied
    features.applyPopulation();

    // Execute query
    const data: any = await features.query;

    // Get total count for pagination metadata
    const total = await this.model.countDocuments(filter);

    const page = parseInt(queryString.page, 10);
    const limit = parseInt(queryString.limit, 10);

    return { data, total, page, limit };
  }

  async advancedFindAll(
    filter: Record<string, any> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      populate?: any;
    } = {}
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.max(Number(options.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { ...filter };

    if (options.search && options.searchFields?.length) {
      query.$or = options.searchFields.map((field) => ({
        [field]: { $regex: options.search, $options: "i" },
      }));
    }

    const sort = options.sort || "-createdAt";

    const [docs, totalDocs] = await Promise.all([
      this.model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(options.populate || []),
      this.model.countDocuments(query),
    ]);

    const totalPages = Math.max(Math.ceil(totalDocs / limit), 1);

    return {
      docs,
      totalDocs,
      totalPages,
      currentPage: page,
      totalPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async softDeleteById(id: string, updatedBy: string): Promise<T | null> {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy },
      { new: true }
    ).exec();
  }

  async deleteMany(filter: any): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount || 0;
  }

  async count(filter: any): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async findWithPopulations(filter: any, options: { skip?: number; limit?: number; sort?: any; fields?: string; populate?: (string | PopulateOptions)[] }): Promise<T[]> {
    let query: any = this.model.find(filter);
    if (options.skip !== undefined) query = query.skip(options.skip);
    if (options.limit !== undefined) query = query.limit(options.limit);
    if (options.sort) query = query.sort(options.sort);
    if (options.fields) query = query.select(options.fields);
    if (options.populate) {
      options.populate.forEach((pop) => {
        query = query.populate(pop);
      });
    }
    return query.exec();
  }
}