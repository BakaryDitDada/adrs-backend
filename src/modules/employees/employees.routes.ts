// src/modules/employee/employees.routes.ts
import { Router } from "express";
import { EmployeeController } from "./employees.controller.js";
import { EmployeeService } from "./employees.service.js";
import { EmployeeRepository } from "./employees.repository.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
// import { restrictTo } from "../../middlewares/role.middleware.js";
import { validateEmployeeCreate, validateEmployeeUpdate, validateEmployeeBulkCreate } from "./employees.middleware.js";

const router: Router = Router();

// Dependency injection
const employeeRepository = new EmployeeRepository();
const employeeService = new EmployeeService(employeeRepository);
const employeeController = new EmployeeController(employeeService);

router.use(protect);

router.route("/bulk-create")
  .post(restrictTo("admin", "hr"), validateEmployeeBulkCreate, employeeController.bulkCreate);

router.route("/advanced")
  .get(employeeController.advancedList);

router.route("/")
  .get(employeeController.list)
  .post(restrictTo("admin", "hr"), validateEmployeeCreate, employeeController.create);

router.route("/soft-delete/:id")
  .delete(restrictTo("admin"), employeeController.softDelete);

router.route("/:id")
  .get(employeeController.get)
  .patch(restrictTo("admin", "hr"), validateEmployeeUpdate, employeeController.update)
  .delete(restrictTo("admin"), employeeController.delete);

export default router;