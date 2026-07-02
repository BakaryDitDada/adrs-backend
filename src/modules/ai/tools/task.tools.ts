import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import mongoose from "mongoose";
import { TaskRepository } from "../../tasks/tasks.repository.js";

let taskRepo: TaskRepository;

export const injectTaskRepo = (repo: TaskRepository) => { taskRepo = repo; };

export const taskTools = [
  // 1. THE MICROSCOPE: Specific search, filtering, and sorting
  new DynamicStructuredTool({
    name: "get_tasks_analytics",
    description: "Calcule les statistiques globales des tâches, le taux d'avancement et la charge de travail actuelle par employé.",
    schema: z.object({
      projectId: z.string().optional().describe("ID optionnel du projet pour filtrer l'analyse")
    }),
    func: async ({ projectId }) => {
      try {
        const matchStage: any = {};
        if (projectId) {
          matchStage.projectId = new mongoose.Types.ObjectId(projectId);
        }

        // Execute a multi-faceted aggregation pipeline
        const [analytics] = await mongoose.model("Task").aggregate([
          { $match: matchStage },
          {
            $facet: {
              // Facet 1: Global Status Breakdown
              statusDistribution: [
                { $group: { _id: "$status", count: { $sum: 1 } } }
              ],
              // Facet 2: Priority Breakdown
              priorityDistribution: [
                { $group: { _id: "$priority", count: { $sum: 1 } } }
              ],
              // Facet 3: Human-Readable Employee Workload Breakdown
              employeeWorkload: [
                // 1. Flatten the assignedTo array of ObjectIDs
                { $unwind: "$assignedTo" },
                // 2. Perform a relational JOIN with your users/employees collection
                {
                  $lookup: {
                    from: "employees", // <-- Replace with your collection name (e.g., "employees", "users")
                    localField: "assignedTo",
                    foreignField: "_id",
                    as: "employeeInfo"
                  }
                },
                // 3. Flatten the resulting array from the lookup stage
                { $unwind: { path: "$employeeInfo", preserveNullAndEmptyArrays: true } },
                // 4. Group by employee and aggregate their specific task counts
                {
                  $group: {
                    _id: "$assignedTo",
                    employeeName: { 
                      $first: { $concat: ["$employeeInfo.firstName", " ", "$employeeInfo.lastName"] } 
                    },
                    totalActiveTasks: { $sum: 1 },
                    inProgressCount: {
                      $sum: { $cond: [{ $eq: ["$status", "En Cours"] }, 1, 0] }
                    }
                  }
                },
                // 5. Clean up the output to make it incredibly readable for the LLM
                {
                  $project: {
                    _id: 0,
                    name: { $ifNull: ["$employeeName", "Collaborateur Inconnu"] },
                    activeTasks: "$totalActiveTasks",
                    inProgress: "$inProgressCount"
                  }
                },
                { $sort: { inProgress: -1 } }
              ]
            }
          }
        ]);

        // Calculate total tasks across the match to give context
        const totalTasks = analytics.statusDistribution.reduce((acc: number, cur: any) => acc + cur.count, 0);

        return JSON.stringify({
          totalTasks,
          statusBreakdown: analytics.statusDistribution,
          priorityBreakdown: analytics.priorityDistribution,
          employeeWorkload: analytics.employeeWorkload
        });

      } catch (error: any) {
        return JSON.stringify({ error: `Erreur d'agrégation: ${error.message}` });
      }
    }
  }),

  // new DynamicStructuredTool({
  //   name: "search_and_list_tasks",
  //   description: "Rechercher, filtrer et lister les tâches de l'entreprise. Idéal pour savoir qui fait quoi, trouver les tâches urgentes ou en retard, ou lister le travail lié à un projet spécifique.",
  //   schema: z.object({
  //     projectId: z.string().optional().describe("ID unique du projet (ObjectId Mongoose) pour voir uniquement ses tâches."),
  //     assignedTo: z.string().optional().describe("ID de l'employé (ObjectId Mongoose) pour voir ses tâches assignées."),
  //     status: z.enum(['A Faire', 'En Cours', 'Terminé', 'Tous']).optional().default('Tous'),
  //     priority: z.enum(['Elevée', 'Médium', 'Bas', 'Tous']).optional().default('Tous'),
  //     searchQuery: z.string().optional().describe("Terme textuel à chercher dans le titre ou la description de la tâche."),
  //     sortBy: z.enum(['echeance_asc', 'priorite_desc', 'avancement_desc']).optional()
  //       .describe("Trier pour trouver les extrêmes (ex: 'echeance_asc' pour les dates limites les plus proches).")
  //   }),
  //   func: async ({ projectId, assignedTo, status, priority, searchQuery, sortBy }) => {
  //     const query: Record<string, any> = { isDeleted: false };

  //     // Handle dynamic filtering inputs
  //     if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);
  //     if (assignedTo) query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  //     if (status && status !== 'Tous') query.status = status;
  //     if (priority && priority !== 'Tous') query.priority = priority;

  //     if (searchQuery) {
  //       query.$or = [
  //         { title: { $regex: searchQuery, $options: 'i' } },
  //         { description: { $regex: searchQuery, $options: 'i' } }
  //       ];
  //     }

  //     // Handle sorting strategies
  //     let sortOptions: Record<string, any> = { createdAt: -1 };
  //     if (sortBy === 'echeance_asc') sortOptions = { dueDate: 1 };
  //     if (sortBy === 'priorite_desc') sortOptions = { priority: -1 }; // Assumes native string enum weights sort or default fallback
  //     if (sortBy === 'avancement_desc') sortOptions = { percentage: -1 };

  //     const tasks = await taskRepo.model.find(query).sort(sortOptions).limit(15);

  //     if (tasks.length === 0) {
  //       return JSON.stringify({ message: "Aucune tâche ne correspond à ces critères." });
  //     }

  //     return JSON.stringify(tasks.map(t => ({
  //       id: t._id,
  //       titre: t.title,
  //       statut: t.status,
  //       type: t.type,
  //       priorite: t.priority,
  //       avancement: `${t.percentage}%`,
  //       dateEcheance: t.dueDate,
  //       notes: t.notes
  //     })));
  //   }
  // }),

  // 2. THE TELESCOPE: Aggregated operational analytics
  new DynamicStructuredTool({
    name: "get_tasks_analytics",
    description: "Obtenir une analyse globale ou par projet de l'avancement des tâches, incluant le taux de complétion et la charge de travail exacte répartie par employé.",
    schema: z.object({
      projectId: z.string().optional().describe("ID optionnel d'un projet pour restreindre les statistiques à ce projet uniquement.")
    }),
    func: async ({ projectId }) => {
      const matchStage: Record<string, any> = { isDeleted: false };
      if (projectId) {
        matchStage.projectId = new mongoose.Types.ObjectId(projectId);
      }

      const stats = await taskRepo.model.aggregate([
        { $match: matchStage },
        {
          $facet: {
            repartitionStatut: [
              { $group: { _id: "$status", volume: { $sum: 1 } } }
            ],
            repartitionPriorite: [
              { $group: { _id: "$priority", volume: { $sum: 1 } } }
            ],
            avancementMoyen: [
              { $group: { _id: null, scoreMoyen: { $avg: "$percentage" } } }
            ],
            // --- UPGRADED TEAM WORKLOAD ANALYTICS ---
            chargeParEmploye: [
              // 1. Skip tasks with no assignees to protect performance
              { $match: { assignedTo: { $exists: true, $not: { $size: 0 } } } },
              // 2. Flatten the array so co-assigned tasks count for EACH employee individually
              { $unwind: "$assignedTo" },
              // 3. Count only active workloads ('A Faire' or 'En Cours')
              { $match: { status: { $ne: "Terminé" } } },
              // 4. Group by individual Employee ID
              {
                $group: {
                  _id: "$assignedTo",
                  tachesActivesEnCours: { $sum: 1 }
                }
              },
              { $sort: { tachesActivesEnCours: -1 } }
            ]
          }
        }
      ]);

      return JSON.stringify(stats[0]);
    }
  })
];