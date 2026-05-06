import { BaseRepository } from "../base/base.repository.js";
import Employee, { IEmployee } from "./employees.model.js";

export class EmployeeRepository extends BaseRepository<IEmployee> {
  constructor(public model = Employee) {
    super(Employee);
  }

  // No need to override create, findById, update, delete – base class provides them.
  // Only add custom methods if necessary.
  async findByEmail(email: string): Promise<IEmployee | null> {
    return this.model.findOne({ workEmail: email }).exec();
  }

  // Soft delete can be implemented in base repository using a flag, but if you need custom logic:
  async softDelete(id: string, updatedBy: string): Promise<IEmployee | null> {
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date(), updatedBy },
      { new: true }
    ).exec();
  }
}