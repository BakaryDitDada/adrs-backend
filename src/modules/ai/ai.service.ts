// src/modules/ai/ai.service.ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { AiRepository } from './ai.repository.js';
import { getSystemPrompt } from './prompts/system.prompts.js';
import { getAllTools, injectRepositories } from './tools/index.js';
import AppError from '../../utils/appError.js';

// Helper type for models that support bindTools
interface ToolBindableModel {
  bindTools(tools: any[]): any;
}

export class AiService {
  private aiRepo: AiRepository;
  private modelWithTools: any; // model with tools bound

  // In-memory cache: key -> { reply: string, timestamp: number }
  private responseCache = new Map<string, { reply: string; timestamp: number }>();
  private toolResultCache = new Map<string, { result: string; timestamp: number }>();
  private readonly CACHE_TTL = 60_000; // 1 minute – adjust as needed

  // Optional: call this in constructor to clean expired cache periodically
  private startCacheCleaner() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.responseCache.entries()) {
        if (now - value.timestamp >= this.CACHE_TTL) this.responseCache.delete(key);
      }
      for (const [key, value] of this.toolResultCache.entries()) {
        if (now - value.timestamp >= this.CACHE_TTL) this.toolResultCache.delete(key);
      }
    }, 60_000);
  }

  constructor(
    aiRepo: AiRepository,
    private model: BaseChatModel,
    private employeeRepo: any,
    private leaveRepo: any,
    private projectRepo: any,
    private taskRepo: any
  ) {
    this.aiRepo = aiRepo;
    injectRepositories({
      employeeRepo: this.employeeRepo,
      leaveRepo: this.leaveRepo,
      projectRepo: this.projectRepo,
      taskRepo: this.taskRepo,
    });

    const tools = getAllTools();
    // Cast model to ToolBindableModel and bind tools
    this.modelWithTools = (this.model as ToolBindableModel).bindTools(tools);

    this.startCacheCleaner();
  }

  // ========== COMPLETE sendMessage METHOD ==========
  async sendMessage(userId: string, conversationId: string | null, message: string, userRole: string) {
    // ---------- 1. CACHE CHECK ----------
    const cacheKey = `${userId}:${userRole}:${message}`;
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`[AI Cache] Hit for: ${cacheKey}`);
      // Get or create conversation to store the cached reply (keeps history consistent)
      let conversation;
      if (conversationId) {
        conversation = await this.aiRepo.getConversation(conversationId, userId);
        if (!conversation) throw new AppError('Conversation non trouvée', 404);
      } else {
        conversation = await this.aiRepo.createConversation(userId);
      }
      await this.aiRepo.addMessage(conversation._id.toString(), 'user', message);
      await this.aiRepo.addMessage(conversation._id.toString(), 'assistant', cached.reply);
      return { conversationId: conversation._id.toString(), reply: cached.reply };
    }

    // ---------- 2. CONVERSATION SETUP ----------
    let conversation;
    if (conversationId) {
      conversation = await this.aiRepo.getConversation(conversationId, userId);
      if (!conversation) throw new AppError('Conversation non trouvée', 404);
    } else {
      conversation = await this.aiRepo.createConversation(userId);
    }

    await this.aiRepo.addMessage(conversation._id.toString(), 'user', message);

    // ---------- 3. BUILD MESSAGES (with history truncation) ----------
    const MAX_HISTORY_MESSAGES = 10;
    const recentMessages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);
    const systemPrompt = getSystemPrompt(userRole) + " Utilise les outils uniquement si nécessaire. Une fois que tu as la réponse, termine la conversation sans répéter l'appel d'outil.";
    const messages = [
      new SystemMessage(systemPrompt),
      ...recentMessages.map(msg => {
        if (msg.role === 'user') return new HumanMessage(msg.content);
        if (msg.role === 'assistant') return new AIMessage(msg.content);
        return new SystemMessage(msg.content);
      }),
      new HumanMessage(message),
    ];

    // ---------- 4. TOOL CALLING LOOP (with iteration guard & tool cache) ----------
    let finalResponse = null;
    let currentMessages = messages;
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations++ < MAX_ITERATIONS) {
      try {
        const response = await this.modelWithTools.invoke(currentMessages);
        currentMessages.push(response);

        if (response.tool_calls && response.tool_calls.length > 0) {
          const tools = getAllTools();
          for (const toolCall of response.tool_calls) {
            const tool = tools.find(t => t.name === toolCall.name);
            if (tool) {
              // Check tool result cache
              const toolCacheKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
              const cachedTool = this.toolResultCache.get(toolCacheKey);
              if (cachedTool && Date.now() - cachedTool.timestamp < this.CACHE_TTL) {
                currentMessages.push(new ToolMessage({
                  content: cachedTool.result,
                  tool_call_id: toolCall.id,
                }));
                continue;
              }

              // Execute tool
              try {
                const result = await tool.invoke(toolCall.args);
                // Store in tool cache
                this.toolResultCache.set(toolCacheKey, { result, timestamp: Date.now() });
                currentMessages.push(new ToolMessage({
                  content: result,
                  tool_call_id: toolCall.id,
                }));
              } catch (err: any) {
                currentMessages.push(new ToolMessage({
                  content: `Erreur lors de l'exécution de l'outil ${toolCall.name}: ${err.message}`,
                  tool_call_id: toolCall.id,
                }));
              }
            }
          }
        } else {
          finalResponse = response.content;
          break;
        }
      } catch (err: any) {
        // Rate limit handling
        if (err.status === 429 || err.statusCode === 429) {
          finalResponse = "Le service AI est actuellement surchargé. Veuillez réessayer dans une minute.";
        } else {
          finalResponse = `Une erreur est survenue lors de la communication avec le service AI: ${err.message}`;
        }
        break;
      }
    }

    if (!finalResponse) {
      finalResponse = "Je n'ai pas pu obtenir de réponse complète après plusieurs tentatives.";
    }

    // ---------- 5. STORE IN CACHE & DATABASE ----------
    this.responseCache.set(cacheKey, { reply: finalResponse, timestamp: Date.now() });
    await this.aiRepo.addMessage(conversation._id.toString(), 'assistant', finalResponse);

    return { conversationId: conversation._id.toString(), reply: finalResponse };
  }

  // async sendMessage(userId: string, conversationId: string | null, message: string, userRole: string) {
  //   let conversation;
  //   if (conversationId) {
  //     conversation = await this.aiRepo.getConversation(conversationId, userId);
  //     if (!conversation) throw new AppError('Conversation non trouvée', 404);
  //   } else {
  //     conversation = await this.aiRepo.createConversation(userId);
  //   }

  //   await this.aiRepo.addMessage(conversation._id.toString(), 'user', message);

  //   const MAX_HISTORY_MESSAGES = 10;
  //   const recentMessages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);

  //   // const systemPrompt = getSystemPrompt(userRole);
  //   const systemPrompt = getSystemPrompt(userRole) + " Utilise les outils uniquement si nécessaire. Une fois que tu as la réponse, termine la conversation sans répéter l'appel d'outil.";
  //   const messages = [
  //     new SystemMessage(systemPrompt),
  //     // ...conversation.messages.map(msg => {
  //     ...recentMessages.map(msg => {
  //       if (msg.role === 'user') return new HumanMessage(msg.content);
  //       if (msg.role === 'assistant') return new AIMessage(msg.content);
  //       return new SystemMessage(msg.content);
  //     }),
  //     new HumanMessage(message),
  //   ];

  //   // Manual tool calling loop
  //   let finalResponse = null;
  //   let currentMessages = messages;

  //   let iterations = 0;
  //   const MAX_ITERATIONS = 5;

  //   while (iterations++ < MAX_ITERATIONS) {
  //   // while (true) {
  //     try {
  //       const response = await this.modelWithTools.invoke(currentMessages);
  //       const responseMessage = response;
  //       currentMessages.push(responseMessage);
  //       if (response.tool_calls && response.tool_calls.length > 0) {
  //         // Execute tools
  //         const tools = getAllTools();
  //         for (const toolCall of response.tool_calls) {
  //           const tool = tools.find(t => t.name === toolCall.name);
  //           if (tool) {
  //             try {
  //             const result = await tool.invoke(toolCall.args);
  //             currentMessages.push(new ToolMessage({
  //               content: result,
  //               tool_call_id: toolCall.id,
  //             }));
  //             } catch (err: any) {              
  //               currentMessages.push(new ToolMessage({
  //                 content: `Erreur lors de l'exécution de l'outil ${toolCall.name}: ${err.message}`,
  //                 tool_call_id: toolCall.id,
  //               }));
  //             }
  //           }
  //         }
  //       } else {
  //         finalResponse = response.content;
  //         break;
  //       }
  //     } catch (err: any) {
  //        if(err.statusCode === 429) {
  //         finalResponse = "Le service AI est actuellement surchargé. Veuillez réessayer plus tard.";
  //       } else {
  //         finalResponse = `Une erreur est survenue lors de la communication avec le service AI: ${err.message}`;
  //       }
  //       break;
  //     }
  //   }

  //   if (!finalResponse) finalResponse = "L'assistant n'a pas pu obtenir de réponse après plusieurs tentatives.";
    
  //   await this.aiRepo.addMessage(conversation._id.toString(), 'assistant', finalResponse);
  //   return { conversationId: conversation._id.toString(), reply: finalResponse };
  // }

  async getConversationHistory(userId: string, conversationId: string) {
    const conv = await this.aiRepo.getConversation(conversationId, userId);
    if (!conv) throw new AppError('Conversation non trouvée', 404);
    return conv.messages;
  }

  async listConversations(userId: string) {
    return this.aiRepo.getUserConversations(userId);
  }

  async generateFlexibleReport(userId: string, userRole: string, query: string = "Générer un rapport"): Promise<string> {
    if (userRole !== 'admin') throw new AppError('Seuls les administrateurs peuvent générer des rapports', 403);

    const tools = getAllTools();
    const modelWithTools = (this.model as ToolBindableModel).bindTools(tools);
    const systemPrompt = `Tu es un assistant de reporting exécutif. Utilise les outils disponibles pour obtenir les données nécessaires et génère un rapport professionnel structuré.

    Demande: "${query}"
    
    Utilise le format Markdown avec titres et puces. Inclus des sections appropriées (RH, Projets, Tâches, etc.). Réponds en français. N'utilise les outils que si nécessaire pour obtenir des données précises. Si tu utilises un outil, attends le résultat avant de continuer. Une fois que tu as toutes les informations, génère le rapport final sans répéter l'appel d'outil. Si la reponse est vide, réponds "Aucune donnée disponible + outils utilisés: ${tools.map(t => t.name).join(', ')}".`;

    let messages = [new SystemMessage(systemPrompt), new HumanMessage(query)];
    let finalResponse = null;

    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations++ < MAX_ITERATIONS) {
    // while (true) {
      const response = await modelWithTools.invoke(messages);
      messages.push(response);
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const tool = tools.find(t => t.name === toolCall.name);
          if (tool) {
            try {
              const result = await tool.invoke(toolCall.args);
              messages.push(new ToolMessage({ content: result, tool_call_id: toolCall.id }));
            } catch (err: any) {
              messages.push(new ToolMessage({
                content: `Erreur lors de l'exécution de l'outil ${toolCall.name}: ${err.message}`,
                tool_call_id: toolCall.id,
              }));
            }
          }
        }
      } else {
        finalResponse = response.content;
        break;
      }
    }

    if (!finalResponse) finalResponse = "L'assistant n'a pas pu obtenir de réponse après plusieurs tentatives.";

    await this.aiRepo.saveReport(userId, 'custom', finalResponse);
    return finalResponse;
  }

  async getUserReports(userId: string) {
    return this.aiRepo.getUserReports(userId);
  }
}