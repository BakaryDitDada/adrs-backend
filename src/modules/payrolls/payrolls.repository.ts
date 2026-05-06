import { Types, QueryFilter } from "mongoose";
import { BaseRepository } from "../base/base.repository.js";
import Payroll, { IPayroll } from "./payrolls.model.js";

export class PayrollRepository extends BaseRepository<IPayroll> {
  constructor(public model = Payroll) {
    super(Payroll);
    
  }

  async findByEmployeeAndPeriod(
    employeeId: Types.ObjectId,
    start: Date,
    end: Date
  ): Promise<IPayroll | null> {
    return this.model.findOne({
      employeeId,
      payPeriodStart: start,
      payPeriodEnd: end,
    }).exec();
  }

  async bulkCreate(payrolls: Partial<IPayroll>[]): Promise<IPayroll[]> {
    const docs = await this.model.insertMany(payrolls);
    return docs.map((doc: any) => doc.toObject() as IPayroll);
  }

  // Fetch the updated payrolls with employee details
  async findPayrollsWithEmployeeDetails(payrollIds: string[]) {
    return this.model.find({ _id: { $in: payrollIds } }).populate('employeeId').exec();
  }

  async updateMany(filter: QueryFilter<IPayroll>, update: any): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await this.model.updateMany(filter, update, { runValidators: true }).exec();
    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
  }

  async findWithPopulations(
    filter: QueryFilter<IPayroll>,
    options: { skip?: number; limit?: number; sort?: any; populate?: string[] }
  ) {
    let query = this.model.find(filter);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.populate) {
      options.populate.forEach(pop => query = query.populate(pop));
    }
    return query.exec();
  }

  async count(filter: QueryFilter<IPayroll>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

}