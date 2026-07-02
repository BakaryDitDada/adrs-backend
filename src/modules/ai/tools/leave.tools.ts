import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import mongoose from "mongoose";
import { LeavesRepository } from "../../leaves/leaves.repository.js";

let leaveRepo: LeavesRepository;

export const injectLeaveRepo = (repo: LeavesRepository) => { leaveRepo = repo; };

export const leaveTools = [
  // 1. THE MICROSCOPE: Review records, tracks, histories
  new DynamicStructuredTool({
    name: "search_leave_requests",
    description: "Rechercher et lister les demandes de congés des employés. Utile pour vérifier l'historique d'un employé, voir les demandes en attente de validation ou filtrer par motif.",
    schema: z.object({
      employeeId: z.string().optional().describe("ID unique de l'employé pour auditer ses congés personnels."),
      status: z.enum(['En attente', 'Approuvé', 'Rejeté', 'Annulé', 'Tous']).optional().default('Tous'),
      type: z.enum(['Annuel', 'Maladie', 'Non payé', 'Autre', 'Tous']).optional().default('Tous')
    }),
    func: async ({ employeeId, status, type }) => {
      const query: Record<string, any> = {};

      if (employeeId) query.employeeId = new mongoose.Types.ObjectId(employeeId);
      if (status && status !== 'Tous') query.status = status;
      if (type && type !== 'Tous') query.type = type;

      const leaves = await leaveRepo.model.find(query).sort({ startDate: -1 }).limit(15);

      if (leaves.length === 0) {
        return JSON.stringify({ message: "Aucun dossier de congé trouvé pour ces critères." });
      }

      return JSON.stringify(leaves.map(l => ({
        id: l._id,
        employeId: l.employeeId,
        type: l.type,
        du: l.startDate,
        au: l.endDate,
        nombreJours: l.days,
        statut: l.status,
        motif: l.reason,
        motifRejet: l.rejectionReason
      })));
    }
  }),

  // 2. THE TELESCOPE: Absences macro dashboard
  new DynamicStructuredTool({
    name: "get_leave_analytics",
    description: "Obtenir une vue d'ensemble macro des absences de l'entreprise (total des jours consommés par type, volume de demandes en attente de traitement).",
    schema: z.object({}),
    func: async () => {
      const analytics = await leaveRepo.model.aggregate([
        {
          $facet: {
            repartitionStatut: [
              { $group: { _id: "$status", totalDemandes: { $sum: 1 } } }
            ],
            joursConsommesParType: [
              // Only count actual approved absences for calculating time off drawdowns
              { $match: { status: "Approuvé" } },
              { 
                $group: { 
                  _id: "$type", 
                  totalJours: { $sum: "$days" },
                  nombreEmployesImpactes: { $addToSet: "$employeeId" } 
                }
              },
              {
                $project: {
                  type: "$_id",
                  totalJours: 1,
                  volumeUniqueEmployes: { $size: "$nombreEmployesImpactes" }
                }
              }
            ]
          }
        }
      ]);

      return JSON.stringify(analytics[0]);
    }
  })
];