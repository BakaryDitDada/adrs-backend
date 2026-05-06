// src/modules/employee/employees.service.ts
import { Types, PopulateOptions } from "mongoose";
import { EmployeeRepository } from "./employees.repository.js";
import { EmployeeCreateInput, EmployeeUpdateInput, EmployeeBulkCreateInput } from "./employees.validation.js";
import { BaseService } from "../base/base.service.js";
import { IEmployee } from "./employees.model.js";
import AppError from "../../utils/appError.js";
import { PaginatedResult } from "@/types/pagination.js";

export class EmployeeService extends BaseService<IEmployee> {
  constructor(private repo: EmployeeRepository) {
    super(repo); // BaseService already provides create, getById, updateById, deleteById
  }

  // Custom method for creation with createdBy/updatedBy
  async createEmployee(data: EmployeeCreateInput, userId: string): Promise<IEmployee> {
    return this.create({
      ...data,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    } as Partial<IEmployee>);
  }

  async bulkCreateEmployees(data: EmployeeBulkCreateInput, userId: string): Promise<IEmployee[]> {
    const userIdObj = new Types.ObjectId(userId);
    const employeesWithAudit = data.employees.map(emp => ({
      ...emp,
      createdBy: userIdObj,
      updatedBy: userIdObj,
    }));
    // Use Promise.all or insertMany for performance
    return Promise.all(employeesWithAudit.map(emp => this.create(emp as Partial<IEmployee>)));
  }

  async listEmployees(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ) {
    // Define populate options PROGRAMMATICALLY (not from query string)
    const populateOptions: (string | PopulateOptions)[] = [
      { path: "userId", select: "username email role" },
      { path: "managerId", select: "firstName lastName employeeId" },
      { path: "createdBy", select: "username email" },
      { path: "updatedBy", select: "username email" },
    ];

    // Use base repository's findAll which supports filter, pagination, sort, search, populate
    return this.repo.findAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["firstName", "lastName", "workEmail", "employeeId", "position"], // for APIFeatures search
      populate: populateOptions,
    });
  }

  async advancedListEmployees(
    filter: any = {},
    pagination: { page?: number; limit?: number; sort?: string; search?: string }
  ): Promise<PaginatedResult<IEmployee>> {
    const populateOptions = [
      { path: "userId", select: "username email role" },
      { path: "managerId", select: "firstName lastName employeeId" },
      { path: "createdBy", select: "username email" },
      { path: "updatedBy", select: "username email" },
    ];

    return this.repo.advancedFindAll(filter, {
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      search: pagination.search,
      searchFields: ["firstName", "lastName", "workEmail", "employeeId", "position"],
      populate: populateOptions,
    });
  }

  // Override getById to ensure population (optional, can also handle in controller)
  async getEmployee(id: string): Promise<IEmployee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new AppError("Employee not found", 404);
    // Populate manually if not done in repository (but repository's findById should populate)
    return employee;
  }

  async updateEmployee(id: string, data: EmployeeUpdateInput, userId: string): Promise<IEmployee> {
    return this.updateById(id, {
      ...data,
      updatedBy: new Types.ObjectId(userId),
    });
  }

  async deleteEmployee(id: string, userId: string): Promise<void> {
    // You might want to soft delete instead; adjust accordingly
    await this.deleteById(id);
  }

  async softDeleteEmployee(id: string, userId: string): Promise<IEmployee> {
    const employee = await this.repo.softDeleteById(id, userId);
    if (!employee) throw new AppError("Employee not found", 404);
    return employee;
  }

  async getEmployeesByDepartment(department: string) {
    return this.repo.findAll({ department });
  }
}