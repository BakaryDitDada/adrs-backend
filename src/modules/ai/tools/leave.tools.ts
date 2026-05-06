import { DynamicTool } from "@langchain/core/tools";
import { LeavesRepository } from "../../leaves/leaves.repository.js";

let leaveRepo: LeavesRepository;

export const injectLeaveRepo = (repo: LeavesRepository) => { leaveRepo = repo; };

export const leaveTools = [
  new DynamicTool({
    name: "get_current_leave_count",
    description: "Obtenir le nombre d'employés actuellement en congé (approuvé).",
    func: async () => {
      const today = new Date();
      const onLeave = await leaveRepo.model.countDocuments({
        status: 'approved',
        startDate: { $lte: today },
        endDate: { $gte: today }
      });
      return JSON.stringify({ employesEnConge: onLeave });
    }
  })
];