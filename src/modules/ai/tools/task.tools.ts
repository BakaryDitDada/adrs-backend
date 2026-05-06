import { DynamicTool } from "@langchain/core/tools";
import { TaskRepository } from "../../tasks/tasks.repository.js";

let taskRepo: TaskRepository;

export const injectTaskRepo = (repo: TaskRepository) => { taskRepo = repo; };

export const taskTools = [
  new DynamicTool({
    name: "get_task_stats",
    description: "Obtenir le nombre de tâches par statut (À faire, En cours, Terminé).",
    func: async () => {
      const stats = await taskRepo.model.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      return JSON.stringify(stats);
    }
  }),
  // Get all tasks with details
  new DynamicTool({
    name: "get_all_tasks",
    description: "Obtenir la liste de toutes les tâches avec titre, statut, projet associé, et date d'échéance.",
    func: async () => {
      const tasks = await taskRepo.findAll({ isDeleted: false }, { populate: ['projectId'] });
      return JSON.stringify(tasks.data.map(t => ({
        titre: t.title,
        statut: t.status,
        projet: (typeof t.projectId === 'object' && t.projectId !== null && 'name' in t.projectId) ? (t.projectId as { name: string }).name : "Aucun",
        dateEcheance: t.dueDate
      })));
    }
  })
];