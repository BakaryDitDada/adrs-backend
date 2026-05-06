import { NextFunction, Request, Response } from "express";
import { EmployeeService } from "./employees.service.js";
import catchAsync from "../../utils/catchAsync.js";

export class EmployeeController {
  constructor(private service: EmployeeService) {}

  create = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.user._id; // `protect` guarantees user exists
    const employee = await this.service.createEmployee(req.body, userId);
    res.status(201).json({ status: "success", data: { employee } });
  });

  bulkCreate = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const employees = await this.service.bulkCreateEmployees(req.body, userId);
    res.status(201).json({ status: "success", data: { employees } });
  });

  list = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    // Filters from query (e.g., ?department=Engineering)
    const filters = { ...req.query };
    const excluded = ["page", "limit", "sort", "search"];
    excluded.forEach(key => delete filters[key]);

    const result = await this.service.listEmployees(filters, { page, limit, sort, search });

    res.status(200).json({
      status: "success",
      results: result.data.length,

      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.data,
    });
  });

  advancedList = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const sort = req.query.sort as string | undefined;
    const search = req.query.search as string | undefined;

    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;
    delete filters.sort;
    delete filters.search;

    const result = await this.service.advancedListEmployees(filters, {
      page,
      limit,
      sort,
      search,
    });

    res.status(200).json({
      status: "success",
      results: result.docs.length,
      pagination: {
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalPerPage: result.totalPerPage,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      },
      data: result.docs,
    });
  });

  get = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const employee = await this.service.getEmployee(req.params.id as string);
    res.status(200).json({ status: "success", data: { employee } });
  });

  update = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const employee = await this.service.updateEmployee(req.params.id as string, req.body, userId);
    res.status(200).json({ status: "success", data: { employee } });
  });

  delete = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    await this.service.deleteEmployee(req.params.id as string, userId);
    res.status(204).send();
  });

  softDelete = catchAsync(async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.user._id;
    const employee = await this.service.softDeleteEmployee(req.params.id as string, userId);
    res.status(200).json({ status: "success", data: { employee } });
  });
}