import { NextFunction, Request, Response } from 'express';
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

  streamChat = async (
    req: Request | any,
    res: Response
  ) => {

    // return console.log("Req.body ::: ", req.body);
    
    try {

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader('Transfer-Encoding', 'chunked');

      // ADD THIS LINE: Tells Nginx / proxies not to buffer this response
      res.setHeader("X-Accel-Buffering", "no");

      res.flushHeaders();
      res.removeHeader('Content-Length');

      res.write(
        `data: ${JSON.stringify({
          type: "connected"
        })}\n\n`
      );

      req.on(
        "close",
        () => {

          console.log(
            "Chat stream closed"
          );

          if (
            !res.writableEnded
          ) {
            res.end();
          }
        }
      );

      const stream =
        this.service.sendMessageStream(
          req.user.id,
          req.body.conversationId,
          req.body.message,
          req.user.role
        );

      for await (const event of stream) {
        // console.log("Stream Event::: ", event);
        console.log(`[${new Date().toISOString()}] Stream Event:::`, event);
        res.write(
          `data: ${JSON.stringify(event)}\n\n`
        );

        // ADD THIS LINE: Force compression middleware to flush out the token immediately
        if (typeof (res as any).flush === "function") {
          (res as any).flush();
        }
      }

      res.end();

      return;

    } catch (error: any) {

      console.error(
        error
      );

      if (
        !res.headersSent
      ) {

        return res.status(500).json({
          status: "error",
          message:
            error.message
        });
      }

      if (
        !res.writableEnded
      ) {

        res.write(
          `data: ${JSON.stringify({
            type: "error",
            content:
              error.message
          })}\n\n`
        );

        res.end();
      }

      return;
    }
  };

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
  
  deleteConversation = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    await this.service.deleteConversation(req.params.id as string);
    res.status(204).send();
  });

  /*
   @Post("/reports/stream")
  */
  // streamReport = async (
  //   req: Request | any,
  //   res: Response
  // ) => {

  //   try {

  //     res.setHeader(
  //       "Content-Type",
  //       "text/event-stream"
  //     );

  //     res.setHeader(
  //       "Cache-Control",
  //       "no-cache"
  //     );

  //     res.setHeader(
  //       "Connection",
  //       "keep-alive"
  //     );

  //     res.flushHeaders();

  //     const stream =
  //       this.service
  //         .generateFlexibleReportStream(
  //           req.user._id,
  //           req.user.role,
  //           req.body.query
  //         );

  //     for await (
  //       const event of stream
  //     ) {

  //       console.log("Stream Event::: ", event)

  //       res.write(
  //         `data: ${JSON.stringify(
  //           event
  //         )}\n\n`
  //       );
  //     }

  //     res.end();

  //   } catch(error: any) {

  //     console.error(error);

  //     if (!res.writableEnded) {

  //       res.write(
  //         `data: ${JSON.stringify({
  //           type: "error",
  //           message:
  //             error.message
  //         })}\n\n`
  //       );

  //       res.end();
  //     }
  //   }
  // };

  streamReport = async (
    req: Request | any,
    res: Response
  ) => {

    try {

      res.setHeader(
        "Content-Type",
        "text/event-stream"
      );

      res.setHeader(
        "Cache-Control",
        "no-cache"
      );

      res.setHeader(
        "Connection",
        "keep-alive"
      );

      res.flushHeaders();

      res.write(
        `data: ${JSON.stringify({
          type: "connected"
        })}\n\n`
      );

      const stream =
        this.service
          .generateFlexibleReportStream(
            req.user.id,
            req.user.role,
            req.body.query
          );

      for await (const event of stream) {
        console.log("Stream Event::: ", event);
        res.write(
          `data: ${JSON.stringify(event)}\n\n`
        );
      }

      res.end();

    } catch (error: any) {

      console.error(error);

      if (!res.writableEnded) {

        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message:
              error.message
          })}\n\n`
        );

        res.end();
      }
    }
  };

  getReports = catchAsync(async (req: Request | any, res: Response) => {
    const userId = req.user._id;
    const reports = await this.service.getUserReports(userId);
    res.status(200).json({ status: 'success', data: { reports } });
  });

  deleteReport = catchAsync(async (req: Request | any, res: Response, _: NextFunction) => {
    await this.service.deleteReport(req.params.id as string);
    res.status(204).send();
  });
}