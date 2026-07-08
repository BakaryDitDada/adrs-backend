import { Request, Response, NextFunction } from 'express';

import catchAsync from '../../utils/catchAsync.js'
import { DashboardService } from './dashboard.service.js';
import { DashboardPeriod } from './dashboard.types.js';

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  getSummary = catchAsync(async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await this.dashboardService.getSummary();

    res.status(200).json({
      status: 'success',
      data,
    });
  });

  getOverviewCharts = catchAsync(async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await this.dashboardService.getOverviewCharts();

    res.status(200).json({
      status: 'success',
      data,
    });
  });

  getTrendCharts = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const period = (req.query.period as DashboardPeriod) || '12m';

    const data = await this.dashboardService.getTrendCharts(period);

    res.status(200).json({
      status: 'success',
      data,
    });
  });

  getWorkloadCharts = catchAsync(async (req: Request, res: Response, _next: NextFunction) => {
    const period = (req.query.period as DashboardPeriod) || '12m';
    const limit = Number(req.query.limit) || 10;

    const data = await this.dashboardService.getWorkloadCharts(period, limit);

    res.status(200).json({
      status: 'success',
      data,
    });
  });
}