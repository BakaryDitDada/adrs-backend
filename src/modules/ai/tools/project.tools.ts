import { DynamicTool } from "@langchain/core/tools";
import { ProjectRepository } from "../../projects/projects.repository.js";

let projectRepo: ProjectRepository;

export const injectProjectRepo = (repo: ProjectRepository) => { projectRepo = repo; };

export const projectTools = [
  new DynamicTool({
    name: "get_active_projects",
    description: "Obtenir la liste des projets actifs avec nom, statut, pourcentage d'avancement, date de fin, budget, description.",
    func: async () => {
      const projects = await projectRepo.findAll({ status: 'active' });
      return JSON.stringify(projects.data.map(p => ({
        nom: p.name,
        statut: p.status,
        avancement: p.percentage,
        dateFin: p.endDate,
        budget: p.budget,
        description: p.description
      })));
    }
  }),
  new DynamicTool({
    name: "get_all_projects_summary",
    description: "Obtenir un résumé de tous les projets (nombre par statut).",
    func: async () => {
      const stats = await projectRepo.model.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      return JSON.stringify(stats);
    }
  }),

  // Ajoutez d'autres outils liés aux projets si nécessaire
  new DynamicTool({
    name: "get_all_projects",
    description: "Obtenir la liste de tous les projets avec nom, statut, pourcentage d'avancement, date de fin, budget, description...",
    func: async () => {
      const projects = await projectRepo.findAll();
      return JSON.stringify(projects.data.map(p => ({
        nom: p.name,
        statut: p.status,
        avancement: p.percentage,
        dateFin: p.endDate,
        budget: p.budget,
        manager: p.manager,
        description: p.description,
      })));
    }
  })

];