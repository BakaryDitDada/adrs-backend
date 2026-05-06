import { UserRepository } from "./users.repository.js";

import { BaseService } from "../base/base.service.js";
import { IUser } from "./users.model.js";

export class UserService extends BaseService<IUser | any> {
  constructor(private repo = new UserRepository()) {
    super(repo);
  }

  async create(data: Partial<any>): Promise<any> {
    return this.repo.createUser(data);
  }

  async bulkCreateUsers(data: any[], validate: boolean = true): Promise<any[]> {
    return Promise.all(data.map(userData => this.repo.createUser(userData, validate)));
  };

  async updateById(id: string, data: Partial<any>): Promise<any> {
    return this.repo.updateUser(id, data);
  }

  async updateOne(filter: any, updates: any): Promise<any> {
    return this.repo.updateOne(filter, updates);
  }

  async updatePassword(id: string, newPassword: string, passwordConfirm: string): Promise<any> {
    return this.repo.updateUser(id, { 
      password: newPassword,
      passwordConfirm: passwordConfirm,
      passwordChangedAt: new Date() });
  }

  async findByEmail(email: string): Promise<any> {
    return this.repo.findByEmail(email);
  }

  async findById(id: string): Promise<any> {
    return this.repo.findById(id);
  }

  async findOne(filter: any): Promise<any> {
    return this.repo.findOne(filter);
  }

  async listUsers(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ) {
    // Use base repository's findAll which supports filter, pagination, sort, search, populate
    return this.repo.findAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["username", "email", "firstName", "lastName"], // for APIFeatures search
    });
  }

}
