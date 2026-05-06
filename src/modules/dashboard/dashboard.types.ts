export type DashboardPeriod = '7d' | '30d' | '90d' | '6m' | '12m';

export interface IDashboardSummary {
  totalActiveEmployees: number;
  pendingLeaves: number;
  totalProjects: number;
  totalInProgressTasks: number;
  totalDocuments: number;
}

export interface IChartPoint {
  label: string;
  value: number;
}

export interface ITimeSeriesPoint {
  label: string;
  value: number;
}

export interface ITopAssigneePoint {
  employeeId: string;
  fullName: string;
  activeTasks: number;
}

export interface ICompletionBucketPoint {
  label: string;
  value: number;
}

export interface IDashboardOverviewCharts {
  employeesByDepartment: IChartPoint[];
  employeesByStatus: IChartPoint[];
  projectsByStatus: IChartPoint[];
  projectsByCompletionBucket: ICompletionBucketPoint[];
  tasksByStatus: IChartPoint[];
  leavesByStatus: IChartPoint[];
}

export interface IDashboardTrendCharts {
  monthlyHires: ITimeSeriesPoint[];
  monthlyLeaveRequests: ITimeSeriesPoint[];
  monthlyProjectCreations: ITimeSeriesPoint[];
  monthlyTaskCreations: ITimeSeriesPoint[];
  monthlyDocumentUploads: ITimeSeriesPoint[];
  monthlyPayrollCosts: ITimeSeriesPoint[];
}

export interface IDashboardWorkloadCharts {
  topTaskAssignees: ITopAssigneePoint[];
  overdueTasksByPriority: IChartPoint[];
}

export interface IDashboardChartsResponse {
  overview: IDashboardOverviewCharts;
  trends: IDashboardTrendCharts;
  workload: IDashboardWorkloadCharts;
}