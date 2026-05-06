import { DynamicTool } from "@langchain/core/tools";
import { EmployeeRepository } from "../../employees/employees.repository.js";

let employeeRepo: EmployeeRepository;

export const injectEmployeeRepo = (repo: EmployeeRepository) => { employeeRepo = repo; };

export const employeeTools = [
  new DynamicTool({
    name: "get_employee_count",
    description: "Obtenir le nombre total d'employés actifs.",
    func: async () => {
      const count = await employeeRepo.count({ isDeleted: false });
      console.log("Tool calling is working ::: ", count);
      return JSON.stringify({ totalEmployes: count });
    }
  }),
  new DynamicTool({
    name: "get_employees_by_role",
    description: "Obtenir la répartition des employés par poste (ex: ingénieur, technicien).",
    func: async () => {
      const byRole = await employeeRepo.model.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$position", count: { $sum: 1 } } }
      ]);
      return JSON.stringify({ repartitionParPoste: byRole });
    }
  }),
  new DynamicTool({
    name: "get_employee_details",
    description: "Obtenir les détails d'un employé spécifique par son ID (admin uniquement).",
    func: async (employeeId: string) => {
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) return JSON.stringify({ erreur: "Employé non trouvé" });
      return JSON.stringify({
        id: employee._id,
        nom: `${employee.firstName} ${employee.lastName}`,
        email: employee.workEmail,
        poste: employee.position,
        departement: employee.department
      });
    }
  })
];