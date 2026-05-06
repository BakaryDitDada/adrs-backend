import { Model } from 'mongoose';
import {
  DashboardPeriod,
  IDashboardOverviewCharts,
  IDashboardSummary,
  IDashboardTrendCharts,
  IDashboardWorkloadCharts,
  IChartPoint,
  ICompletionBucketPoint,
  ITimeSeriesPoint,
  ITopAssigneePoint,
} from './dashboard.types.js';

type AnyModel = Model<any>;

type Granularity = 'day' | 'month';

interface TimeWindow {
  start: Date;
  end: Date;
  granularity: Granularity;
  keys: string[];
  labels: string[];
}

export class DashboardRepository {
  constructor(
    private readonly employeeModel: AnyModel,
    private readonly leaveModel: AnyModel,
    private readonly projectModel: AnyModel,
    private readonly taskModel: AnyModel,
    private readonly documentModel: AnyModel,
    private readonly payrollModel: AnyModel
  ) {}

  private readonly notDeletedMatch = {
    $or: [{ isDeleted: { $exists: false } }, { isDeleted: { $ne: true } }],
  };

  async getSummaryCounts(): Promise<IDashboardSummary> {
    const [
      totalActiveEmployees,
      pendingLeaves,
      totalProjects,
      totalInProgressTasks,
      totalDocuments,
    ] = await Promise.all([
      this.employeeModel.countDocuments({
        ...this.notDeletedMatch,
        employmentStatus: 'active',
      }),
      this.leaveModel.countDocuments({
        status: 'En attente',
      }),
      this.projectModel.countDocuments({
        ...this.notDeletedMatch,
      }),
      this.taskModel.countDocuments({
        ...this.notDeletedMatch,
        status: 'En Cours',
      }),
      this.documentModel.countDocuments({
        ...this.notDeletedMatch,
      }),
    ]);

    return {
      totalActiveEmployees,
      pendingLeaves,
      totalProjects,
      totalInProgressTasks,
      totalDocuments,
    };
  }

  async getOverviewCharts(): Promise<IDashboardOverviewCharts> {
    const [
      employeesByDepartment,
      employeesByStatus,
      projectsByStatus,
      projectsByCompletionBucket,
      tasksByStatus,
      leavesByStatus,
    ] = await Promise.all([
      this.aggregateCountByField(this.employeeModel, 'department', {
        ...this.notDeletedMatch,
      }),
      this.aggregateCountByField(this.employeeModel, 'employmentStatus', {
        ...this.notDeletedMatch,
      }),
      this.aggregateCountByField(this.projectModel, 'status', {
        ...this.notDeletedMatch,
      }),
      this.aggregateProjectCompletionBuckets(),
      this.aggregateCountByField(this.taskModel, 'status', {
        ...this.notDeletedMatch,
      }),
      this.aggregateCountByField(this.leaveModel, 'status', {}),
    ]);

    return {
      employeesByDepartment,
      employeesByStatus,
      projectsByStatus,
      projectsByCompletionBucket,
      tasksByStatus,
      leavesByStatus,
    };
  }

  async getTrendCharts(period: DashboardPeriod): Promise<IDashboardTrendCharts> {
    const window = this.resolveWindow(period);

    const [
      monthlyHires,
      monthlyLeaveRequests,
      monthlyProjectCreations,
      monthlyTaskCreations,
      monthlyDocumentUploads,
      monthlyPayrollCosts,
    ] = await Promise.all([
      this.aggregateTimeSeriesCount(this.employeeModel, 'hireDate', window, {
        ...this.notDeletedMatch,
      }),
      this.aggregateTimeSeriesCount(this.leaveModel, 'createdAt', window, {}),
      this.aggregateTimeSeriesCount(this.projectModel, 'createdAt', window, {
        ...this.notDeletedMatch,
      }),
      this.aggregateTimeSeriesCount(this.taskModel, 'startDate', window, {
        ...this.notDeletedMatch,
      }),
      this.aggregateTimeSeriesCount(this.documentModel, 'createdAt', window, {
        ...this.notDeletedMatch,
      }),
      this.aggregateTimeSeriesSum(this.payrollModel, 'paymentDate', 'netPay', window, {
        status: 'paid',
      }),
    ]);

    return {
      monthlyHires,
      monthlyLeaveRequests,
      monthlyProjectCreations,
      monthlyTaskCreations,
      monthlyDocumentUploads,
      monthlyPayrollCosts,
    };
  }

  async getWorkloadCharts(
    period: DashboardPeriod,
    limit: number
  ): Promise<IDashboardWorkloadCharts> {
    const window = this.resolveWindow(period);

    const [topTaskAssignees, overdueTasksByPriority] = await Promise.all([
      this.getTopTaskAssignees(window, limit),
      this.aggregateOverdueTasksByPriority(),
    ]);

    return {
      topTaskAssignees,
      overdueTasksByPriority,
    };
  }

  private async aggregateCountByField(
    model: AnyModel,
    field: string,
    match: Record<string, any> = {}
  ): Promise<IChartPoint[]> {
    const rows = await model.aggregate([
      { $match: match },
      {
        $group: {
          _id: `$${field}`,
          value: { $sum: 1 },
        },
      },
      { $sort: { value: -1, _id: 1 } },
    ]);

    return rows.map((row: any) => ({
      label: this.normalizeLabel(row._id),
      value: row.value ?? 0,
    }));
  }

  private async aggregateProjectCompletionBuckets(): Promise<ICompletionBucketPoint[]> {
    const rows = await this.projectModel.aggregate([
      { $match: { ...this.notDeletedMatch } },
      {
        $project: {
          percentage: { $ifNull: ['$percentage', 0] },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$percentage', 25] }, then: '0-24%' },
                { case: { $lt: ['$percentage', 50] }, then: '25-49%' },
                { case: { $lt: ['$percentage', 75] }, then: '50-74%' },
                { case: { $lt: ['$percentage', 100] }, then: '75-99%' },
              ],
              default: '100%',
            },
          },
          value: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const order = ['0-24%', '25-49%', '50-74%', '75-99%', '100%'];
    const map = new Map<string, number>();
    rows.forEach((row: any) => map.set(row._id, row.value ?? 0));

    return order.map((label) => ({
      label,
      value: map.get(label) ?? 0,
    }));
  }

  private async aggregateTimeSeriesCount(
    model: AnyModel,
    dateField: string,
    window: TimeWindow,
    match: Record<string, any> = {}
  ): Promise<ITimeSeriesPoint[]> {
    const rows = await model.aggregate([
      {
        $match: {
          ...match,
          [dateField]: {
            $gte: window.start,
            $lte: window.end,
          },
        },
      },
      {
        $group: {
          _id: this.groupIdByWindow(dateField, window.granularity),
          value: { $sum: 1 },
        },
      },
    ]);

    return this.fillTimeSeries(window, rows);
  }

  private async aggregateTimeSeriesSum(
    model: AnyModel,
    dateField: string,
    sumField: string,
    window: TimeWindow,
    match: Record<string, any> = {}
  ): Promise<ITimeSeriesPoint[]> {
    const rows = await model.aggregate([
      {
        $match: {
          ...match,
          [dateField]: {
            $gte: window.start,
            $lte: window.end,
          },
        },
      },
      {
        $group: {
          _id: this.groupIdByWindow(dateField, window.granularity),
          value: { $sum: `$${sumField}` },
        },
      },
    ]);

    return this.fillTimeSeries(window, rows);
  }

  private async getTopTaskAssignees(
    window: TimeWindow,
    limit: number
  ): Promise<ITopAssigneePoint[]> {
    const rows = await this.taskModel.aggregate([
      {
        $match: {
          ...this.notDeletedMatch,
          status: { $in: ['A Faire', 'En Cours'] },
          assignedTo: { $exists: true, $ne: [] },
          startDate: {
            $gte: window.start,
            $lte: window.end,
          },
        },
      },
      { $unwind: '$assignedTo' },
      {
        $group: {
          _id: '$assignedTo',
          activeTasks: { $sum: 1 },
        },
      },
      { $sort: { activeTasks: -1, _id: 1 } },
      { $limit: limit },
    ]);

    const assigneeIds = rows.map((row: any) => row._id).filter(Boolean);

    const employees = await this.employeeModel
      .find(
        {
          _id: { $in: assigneeIds },
          ...this.notDeletedMatch,
        },
        { firstName: 1, lastName: 1 }
      )
      .lean();

    const employeeMap = new Map(
      employees.map((employee: any) => [
        String(employee._id),
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
      ])
    );

    return rows.map((row: any) => ({
      employeeId: String(row._id),
      fullName: employeeMap.get(String(row._id)) || 'Unknown assignee',
      activeTasks: row.activeTasks ?? 0,
    }));
  }

  private async aggregateOverdueTasksByPriority(): Promise<IChartPoint[]> {
    const now = new Date();

    const rows = await this.taskModel.aggregate([
      {
        $match: {
          ...this.notDeletedMatch,
          dueDate: { $lt: now },
          status: { $ne: 'Terminé' },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$priority', 'Bas'] },
          value: { $sum: 1 },
        },
      },
      { $sort: { value: -1, _id: 1 } },
    ]);

    return rows.map((row: any) => ({
      label: this.normalizeLabel(row._id),
      value: row.value ?? 0,
    }));
  }

  private resolveWindow(period: DashboardPeriod): TimeWindow {
    const end = new Date();
    const start = new Date(end);

    let granularity: Granularity = 'month';

    switch (period) {
      case '7d':
        granularity = 'day';
        start.setDate(start.getDate() - 6);
        break;
      case '30d':
        granularity = 'day';
        start.setDate(start.getDate() - 29);
        break;
      case '90d':
        granularity = 'day';
        start.setDate(start.getDate() - 89);
        break;
      case '6m':
        granularity = 'month';
        start.setMonth(start.getMonth() - 5);
        start.setDate(1);
        break;
      case '12m':
      default:
        granularity = 'month';
        start.setMonth(start.getMonth() - 11);
        start.setDate(1);
        break;
    }

    const keys: string[] = [];
    const labels: string[] = [];

    const cursor = new Date(start);
    if (granularity === 'day') {
      cursor.setHours(0, 0, 0, 0);
      const endCursor = new Date(end);
      endCursor.setHours(0, 0, 0, 0);

      while (cursor <= endCursor) {
        keys.push(this.dayKey(cursor));
        labels.push(
          new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
          }).format(cursor)
        );
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      cursor.setDate(1);
      cursor.setHours(0, 0, 0, 0);
      const endCursor = new Date(end);
      endCursor.setDate(1);
      endCursor.setHours(0, 0, 0, 0);

      while (cursor <= endCursor) {
        keys.push(this.monthKey(cursor));
        labels.push(
          new Intl.DateTimeFormat('en-US', {
            month: 'short',
            year: 'numeric',
          }).format(cursor)
        );
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return { start, end, granularity, keys, labels };
  }

  private groupIdByWindow(dateField: string, granularity: Granularity) {
    if (granularity === 'day') {
      return {
        year: { $year: `$${dateField}` },
        month: { $month: `$${dateField}` },
        day: { $dayOfMonth: `$${dateField}` },
      };
    }

    return {
      year: { $year: `$${dateField}` },
      month: { $month: `$${dateField}` },
    };
  }

  private fillTimeSeries(
    window: TimeWindow,
    rows: any[]
  ): ITimeSeriesPoint[] {
    const map = new Map<string, number>();

    for (const row of rows) {
      const key =
        window.granularity === 'day'
          ? this.dayKeyFromGroup(row._id)
          : this.monthKeyFromGroup(row._id);

      map.set(key, row.value ?? 0);
    }

    return window.keys.map((key, index) => ({
      label: window.labels[index],
      value: map.get(key) ?? 0,
    }));
  }

  private dayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private monthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private dayKeyFromGroup(group: any): string {
    const year = String(group.year);
    const month = String(group.month).padStart(2, '0');
    const day = String(group.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private monthKeyFromGroup(group: any): string {
    const year = String(group.year);
    const month = String(group.month).padStart(2, '0');
    return `${year}-${month}`;
  }

  private normalizeLabel(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Unknown';
    return String(value);
  }
}