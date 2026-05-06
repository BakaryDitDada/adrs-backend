import {
  DashboardPeriod,
  IDashboardOverviewCharts,
  IDashboardSummary,
  IDashboardTrendCharts,
  IDashboardWorkloadCharts,
} from './dashboard.types.js';
import { DashboardRepository } from './dashboard.repository.js';

export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  getSummary = async (): Promise<IDashboardSummary> => {
    return this.dashboardRepository.getSummaryCounts();
  };

  getOverviewCharts = async (): Promise<IDashboardOverviewCharts> => {
    return this.dashboardRepository.getOverviewCharts();
  };

  getTrendCharts = async (
    period: DashboardPeriod = '12m'
  ): Promise<IDashboardTrendCharts> => {
    return this.dashboardRepository.getTrendCharts(period);
  };

  getWorkloadCharts = async (
    period: DashboardPeriod = '12m',
    limit = 10
  ): Promise<IDashboardWorkloadCharts> => {
    return this.dashboardRepository.getWorkloadCharts(period, limit);
  };
}