import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";
import { DashboardRepository } from "./dashboard.repository.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

// Import models (adjust paths if needed)
import Employee from "../employees/employees.model.js";
import Leave from "../leaves/leaves.model.js";
import Project from "../projects/projects.model.js";
import Task from "../tasks/tasks.model.js";
import Document from "../documents/docs.model.js";
import Payroll from "../payrolls/payrolls.model.js";

const dashboardRouter: Router = Router();

// Dependency injection (same style as your employee module)
const dashboardRepository = new DashboardRepository(
  Employee,
  Leave,
  Project,
  Task,
  Document,
  Payroll
);

const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

// Protect all routes
dashboardRouter.use(protect);

// Summary KPIs
dashboardRouter
  .route("/summary")
  .get(
    restrictTo("admin", "hr"),
    // validateDashboardSummaryQuery,
    dashboardController.getSummary
  );

// Overview charts (distribution-level analytics)
dashboardRouter
  .route("/charts/overview")
  .get(
    restrictTo("admin", "hr"),
    // validateDashboardOverviewQuery,
    dashboardController.getOverviewCharts
  );

// Trends (time-series analytics)
dashboardRouter
  .route("/charts/trends")
  .get(
    restrictTo("admin", "hr"),
    // validateDashboardTrendQuery,
    dashboardController.getTrendCharts
  );

// Workload & operational analytics
dashboardRouter
  .route("/charts/workload")
  .get(
    restrictTo("admin", "hr"),
    // validateDashboardWorkloadQuery,
    dashboardController.getWorkloadCharts
  );

export default dashboardRouter;