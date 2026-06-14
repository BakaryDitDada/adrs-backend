import { Request, Response } from 'express';
import { AiService } from './ai.service.js';
import catchAsync from '../../utils/catchAsync.js';
// import AppError from '../../utils/appError.js';

export class AiController {
  constructor(private service: AiService) {}

  chat = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { conversationId, message } = req.body;
    const result = await this.service.sendMessage(userId, conversationId, message, userRole);
    res.status(200).json({ status: 'success', data: result });
  });

  getConversations = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const conversations = await this.service.listConversations(userId);
    res.status(200).json({ status: 'success', data: { conversations } });
  });

  getConversationHistory = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const messages = await this.service.getConversationHistory(userId, req.params.id);
    res.status(200).json({ status: 'success', data: { messages } });
  });

  generateReport = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { query } = req.body;

    const report = await this.service.generateFlexibleReport(userId, userRole, query);
        
    res.status(200).json({ status: 'success', data: { report } });

    // const manualReport = `# Rapport d’Activités – Organisation X
    // ## Introduction
    // Ce rapport présente une synthèse des activités réalisées au cours du premier trimestre 2026. Il vise à fournir une vue d’ensemble claire et structurée de la situation actuelle de l’organisation.
    // ---
    // ## Objectifs
    // - Renforcer la capacité opérationnelle des équipes.
    // - Améliorer la qualité des services rendus aux bénéficiaires.
    // - Optimiser la gestion des ressources humaines et financières.
    // - Développer de nouvelles perspectives de partenariat.
    // ---
    // ## Réalisations
    // - Mise en place d’un système de suivi numérique des projets.
    // - Organisation de 3 ateliers de formation pour le personnel.
    // - Lancement d’un programme pilote dans deux régions.
    // - Amélioration du taux de satisfaction des bénéficiaires (+15%).
    // ---
    // ## Situation du Personnel
    // | Catégorie        | Effectif | Observations                  |
    // |------------------|----------|-------------------------------|
    // | Administratif    | 12       | Stabilité du personnel        |
    // | Technique        | 25       | Besoin de renforcement        |
    // | Terrain          | 30       | Forte implication constatée   |
    // | Total            | 67       | Ressources globalement stables|
    // ---
    // ## Perspectives
    // - Extension du programme pilote à l’échelle nationale.
    // - Renforcement des capacités techniques par des formations ciblées.
    // - Développement de partenariats stratégiques avec des institutions locales et internationales.
    // - Mise en place d’un plan de digitalisation des processus internes.
    // ---
    // ## Conclusion
    // L’organisation a atteint des résultats significatifs au cours de ce trimestre, malgré certaines contraintes. Les perspectives identifiées permettront de consolider les acquis et d’ouvrir de nouvelles opportunités pour le développement futur.`;

    // res.status(200).json({ status: 'success', data: { manualReport } });
  });

  getReports = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const reports = await this.service.getUserReports(userId);
    res.status(200).json({ status: 'success', data: { reports } });
  });
}