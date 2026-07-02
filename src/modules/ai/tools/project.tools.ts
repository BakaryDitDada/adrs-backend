import { DynamicStructuredTool } from "@langchain/core/tools";
import { ProjectRepository } from "../../projects/projects.repository.js";
import { z } from "zod";

let projectRepo: ProjectRepository;

export const injectProjectRepo = (repo: ProjectRepository) => { projectRepo = repo; };

export const projectTools = [
  new DynamicStructuredTool({
    name: "search_and_list_projects",
    description: `
      Rechercher, filtrer et lister les projets de l'entreprise. 
      Ce outil est très puissant et permet d'analyser, de trier et de trouver des projets spécifiques pour répondre à des questions complexes (ex: le plus gros budget, par mot-clé, etc.).
    `,
    schema: z.object({
      status: z.enum(['Planifié', 'En cours', 'Terminé', 'Annulé/Suspendu', 'Tous'])
        .optional()
        .default('Tous')
        .describe("Filtrer par statut exact du projet."),
      
      searchQuery: z.string()
        .optional()
        .describe("Un mot-clé ou terme à rechercher dans le NOM ou la DESCRIPTION du projet (ex: 'Mali', 'Forage', 'RH')."),
      
      sortBy: z.enum(['budget_desc', 'avancement_desc', 'date_recent'])
        .optional()
        .describe("Trier les résultats pour répondre à des questions sur les extrêmes (ex: 'plus gros budget', 'plus avancé').")
    }),
    func: async ({ status, searchQuery, sortBy }) => {
      // 1. Build a dynamic MongoDB query object
      const query: Record<string, any> = { isDeleted: false };

      // Handle French status mapping safely
      if (status && status !== 'Tous') {
        query.status = status;
      }

      // Handle text keyword search across Name OR Description using Regex
      if (searchQuery) {
        query.$or = [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      // 2. Build the Sorting Strategy
      let sortOptions: Record<string, any> = { createdAt: -1 }; // default fallback
      if (sortBy === 'budget_desc') sortOptions = { budget: -1 };
      if (sortBy === 'avancement_desc') sortOptions = { percentage: -1 };
      if (sortBy === 'date_recent') sortOptions = { startDate: -1 };

      // 3. Query the DB directly using the underlying model to have absolute sort/limit control
      const projects = await projectRepo.model
        .find(query)
        .sort(sortOptions)
        .limit(15); // Hard protection: Top 15 highly relevant matches is perfect for LLM context

      if (projects.length === 0) {
        return JSON.stringify({ 
          statut: "succes", 
          message: "Aucun projet ne correspond à ces critères de recherche." 
        });
      }

      // 4. Return clean payload
      return JSON.stringify(projects.map(p => ({
        id: p._id,
        code: p.code,
        nom: p.name,
        statut: p.status,
        avancement: `${p.percentage || 0}%`,
        budget: `${p.budget || 0} ${p.currency || 'XOF'}`,
        description: p.description
      })));
    }
  }),

  // 2. THE TELESCOPE: Aggregated macro dashboard tool
  new DynamicStructuredTool({
    name: "get_projects_dashboard_stats",
    description: "Obtenir une vue d'ensemble macro et statistique de tous les projets, incluant les répartitions par statut, les métriques financières globales, ainsi que l'analyse détaillée des sources de financement (qui finance quoi et à quelle hauteur).",
    schema: z.object({}),
    func: async () => {
      const stats = await projectRepo.model.aggregate([
        // Enforce soft-delete rule manually since middleware doesn't intercept aggregate
        { $match: { isDeleted: false } },
        {
          $facet: {
            repartitionParStatut: [
              { $group: { _id: "$status", count: { $sum: 1 } } }
            ],
            metriquesFinancieres: [
              { 
                $group: { 
                  _id: null, 
                  budgetTotal: { $sum: "$budget" }, 
                  budgetMoyen: { $avg: "$budget" } 
                } 
              }
            ],
            // --- NEW FUNDING SOURCES ANALYTICS SUB-PIPELINE ---
            financementParSource: [
              // 1. Filter out documents that have no funding sources to accelerate execution
              { $match: { fundingSources: { $exists: true, $not: { $size: 0 } } } },
              // 2. Deconstruct the array so we can treat each funding item as a separate document
              { $unwind: "$fundingSources" },
              // 3. Group and accumulate totals while cleaning up dirty entries via String operators
              {
                $group: {
                  _id: { $trim: { input: { $toUpper: "$fundingSources.name" } } },
                  financementCumule: { $sum: "$fundingSources.amount" },
                  nombreDeProjetsFinances: { $sum: 1 }
                }
              },
              // 4. Sort from biggest sponsor to smallest sponsor
              { $sort: { financementCumule: -1 } }
            ]
          }
        }
      ]);

      // Flatten the array response for clean context ingestion by the LLM
      return JSON.stringify(stats[0]);
    }
  })

];