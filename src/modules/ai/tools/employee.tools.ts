import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { EmployeeRepository } from "../../employees/employees.repository.js";

let employeeRepo: EmployeeRepository;

export const injectEmployeeRepo = (repo: EmployeeRepository) => { employeeRepo = repo; };

// 1. Wrap in a factory so the Repo is injected per-request, eliminating global state bugs.
export const employeeTools = [

  // new DynamicStructuredTool({
  //   name: "get_employee_count",
  //   description: "Obtenir le nombre total d'employés actifs dans l'entreprise.",
  //   // Forcing an empty object schema prevents the LLM from hallucinating dummy arguments
  //   schema: z.object({}), 
  //   func: async () => {
  //     const count = await employeeRepo.count({ isDeleted: false });
  //     return JSON.stringify({ totalEmployes: count });
  //   },
  // }),

  // new DynamicStructuredTool({
  //   name: "get_employees_by_role",
  //   description: "Obtenir la répartition quantitative des employés groupés par poste (ex: ingénieur, technicien).",
  //   schema: z.object({}),
  //   func: async () => {
  //     const byRole = await employeeRepo.model.aggregate([
  //       { $match: { isDeleted: false } },
  //       { $group: { _id: "$position", count: { $sum: 1 } } }
  //     ]);
  //     return JSON.stringify({ repartitionParPoste: byRole });
  //   },
  // }),

  new DynamicStructuredTool({
    name: "get_employee_details",
    description: "Rechercher les informations détaillées d'un employé en utilisant obligatoirement son ID unique.",
    schema: z.object({
      employeeId: z.string().describe("L'identifiant MongoDB unique de l'employé (ex: 60c72b2f9b1e8a001c8e4b2a)"),
    }),
    // Notice the destructured { employeeId } inside the arguments now!
    func: async ({ employeeId }) => {
      try {
        const employee = await employeeRepo.findById(employeeId);
        
        if (!employee) {
          return JSON.stringify({ 
            statut: "echec", 
            message: `Aucun employé trouvé avec l'ID '${employeeId}'. Demandez à l'utilisateur de vérifier l'ID.` 
          });
        }

        return JSON.stringify({
          id: employee._id,
          nom: `${employee.firstName} ${employee.lastName}`,
          email: employee.workEmail,
          poste: employee.position,
          departement: employee.department
        });
      } catch (error) {
        // Catches BSONTypeError if the LLM passes a malformed string that isn't a true Mongo ObjectId
        return JSON.stringify({ statut: "erreur", message: "Format d'ID invalide." });
      }
    },
  }),

  new DynamicStructuredTool({
    name: "get_employees_stats",
    description: `
      Obtenir des statistiques globales et des indicateurs de performance sur l'ensemble des employés. 
      À UTILISER OBLIGATOIREMENT lorsque l'utilisateur :
      - Demande le nombre total d'employés ("combien d'employés...", "Combien de ...").
      - Demande une répartition, un pourcentage ou des statistiques.
      - Mentionne des critères globaux comme le genre, le type de contrat (CDI/CDD), le poste, le département ou le statut.
      
      NE PAS UTILISER pour rechercher les informations personnelles d'un seul employé spécifique.
    `,
    schema: z.object({}),
    func: async () => {
      const stats = await employeeRepo.model.aggregate([
        // Note: Your Mongoose pre(/^find/) middleware does NOT apply to aggregations!
        // We must explicitly match isDeleted: false here.
        { $match: { isDeleted: false } },
        {
          $facet: {
            totalEmployes: [
              { $count: "count" }
            ],
            parPoste: [
              { $group: { _id: "$position", count: { $sum: 1 } } },
              { $sort: { count: -1 } } // Sort highest to lowest
            ],
            parGenre: [
              { $group: { _id: "$gender", count: { $sum: 1 } } }
            ],
            parTypeContrat: [
              { $group: { _id: "$contractType", count: { $sum: 1 } } }
            ],
            parDepartement: [
              { $group: { _id: "$department", count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            parStatut: [
              { $group: { _id: "$employmentStatus", count: { $sum: 1 } } }
            ]
          }
        }
      ]);

      // $facet always returns an array with a single object containing our keys
      // We extract stats[0] to give the LLM a clean, flat JSON structure.
      return JSON.stringify(stats[0]);
    }
  })

];

// import { DynamicTool } from "@langchain/core/tools";
// import { EmployeeRepository } from "../../employees/employees.repository.js";

// let employeeRepo: EmployeeRepository;

// export const injectEmployeeRepo = (repo: EmployeeRepository) => { employeeRepo = repo; };

// export const employeeTools = [
//   new DynamicTool({
//     name: "get_employee_count",
//     description: "Obtenir le nombre total d'employés actifs.",
//     func: async () => {
//       const count = await employeeRepo.count({ isDeleted: false });
//       console.log("Tool calling is working ::: ", count);
//       return JSON.stringify({ totalEmployes: count });
//     }
//   }),
//   new DynamicTool({
//     name: "get_employees_by_role",
//     description: "Obtenir la répartition des employés par poste (ex: ingénieur, technicien).",
//     func: async () => {
//       const byRole = await employeeRepo.model.aggregate([
//         { $match: { isDeleted: false } },
//         { $group: { _id: "$position", count: { $sum: 1 } } }
//       ]);
//       return JSON.stringify({ repartitionParPoste: byRole });
//     }
//   }),
//   new DynamicTool({
//     name: "get_employee_details",
//     description: "Obtenir les détails d'un employé spécifique par son ID (admin uniquement).",
//     func: async (employeeId: string) => {
//       const employee = await employeeRepo.findById(employeeId);
//       if (!employee) return JSON.stringify({ erreur: "Employé non trouvé" });
//       return JSON.stringify({
//         id: employee._id,
//         nom: `${employee.firstName} ${employee.lastName}`,
//         email: employee.workEmail,
//         poste: employee.position,
//         departement: employee.department
//       });
//     }
//   })
// ];