// src/modules/leaves/leaves.repository.ts
import { Types, QueryFilter } from 'mongoose';
import { BaseRepository } from '../base/base.repository.js';
import Leave, { ILeave } from './leaves.model.js';

export class LeavesRepository extends BaseRepository<ILeave> {
  constructor(public model = Leave) {
    super(Leave);
  }

  async findOverlapping(
    employeeId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<ILeave | null> {
    const query: QueryFilter<ILeave> = {
      employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    };
    if (excludeId) query._id = { $ne: excludeId };
    return this.model.findOne(query).exec();
  }

  async findByEmployeeAndStatus(
    employeeId: Types.ObjectId,
    status?: ILeave['status']
  ): Promise<ILeave[]> {
    const filter: QueryFilter<ILeave> = { employeeId };
    if (status) filter.status = status;
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findPendingById(id: string): Promise<ILeave | null> {
    return this.model.findOne({ _id: id, status: 'pending' }).exec();
  }

  async updateWithPopulate(
    id: string,
    updateData: Partial<ILeave>,
    populateFields: string[] = []
  ): Promise<ILeave | null> {
    let query = this.model.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    populateFields.forEach(field => query = query.populate(field));
    return query.exec();
  }

  // async findWithPopulations(
  //   filter: QueryFilter<ILeave>,
  //   options: { skip?: number; limit?: number; sort?: any; populate?: string[] } = {}
  // ): Promise<ILeave[]> {
  //   let query = this.model.find(filter);
  //   if (options.skip) query = query.skip(options.skip);
  //   if (options.limit) query = query.limit(options.limit);
  //   if (options.sort) query = query.sort(options.sort);
  //   if (options.populate) options.populate.forEach(field => query = query.populate(field));
  //   return query.exec();
  // }

  async count(filter: QueryFilter<ILeave>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}