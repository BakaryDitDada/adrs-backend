// src/modules/ai/ai.service.ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { AiRepository } from './ai.repository.js';
import { getSystemPrompt } from './prompts/system.prompts.js';
import { getAllTools, injectRepositories } from './tools/index.js';
import { getRelevantTools } from './ai.utils.js';
import AppError from '../../utils/appError.js';
import { StreamEvent, ReportStreamEvent } from '../../types/ai.types.js';

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

  /**
   * Combined Security & Relevance Gateway
   * 1. Filters tools programmatically by User Role (Security)
   * 2. Narrows down the remaining tools by prompt intent (Token Optimization)
   */
  private getSecuredRelevantTools(userRole: string, message: string): any[] {
    // 1. Fetch every tool registered in the application
    const allTools = getAllTools();
    
    // 2. SECURITY LAYER: Strip away unauthorized assets immediately
    let authorizedTools = allTools;
    if (userRole !== "admin") {
      authorizedTools = allTools.filter(tool => 
        !tool.name.includes("analytics") && 
        !tool.name.includes("stats") && 
        !tool.name.includes("dashboard")
      );
    }

    // 3. RELEVANCE LAYER: Run your matching utility against the SAFE subset only
    const targetedTools = getRelevantTools(message, authorizedTools);

    // Safety Fallback: If relevance filtering was too aggressive and returned 0 tools, 
    // fall back to supplying the full authorized list so the LLM doesn't break.
    if (targetedTools.length === 0) {
      return authorizedTools;
    }

    return targetedTools;
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
        if(message) {
          conversation = await this.aiRepo.createConversation(userId, `Cached: ${message.slice(0, 20)}...`);
        } else {
          conversation = await this.aiRepo.createConversation(userId);
        }
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
    let currentMessages: any = messages;
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations++ < MAX_ITERATIONS) {
      try {
        const response = await this.modelWithTools.invoke(currentMessages);
        currentMessages.push(response);

        if (response.tool_calls && response.tool_calls.length > 0) {
          const tools = getAllTools();
          for (const toolCall of response.tool_calls) {
            const tool: any = tools.find(t => t.name === toolCall.name);
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
                const result: any = await tool.invoke(toolCall.args);
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

  // ========== Complete sendMessageStream Method (with tool calling loop) ==========
  async *sendMessageStream(
    userId: string,
    conversationId: string | null,
    message: string,
    userRole: string
  ): AsyncGenerator<StreamEvent> {

    try {
      // 1. Check normalization cache to avoid unnecessary LLM compute cycles
      const normalizedMessage = message
        .trim()
        .toLowerCase()
        .replace(/[?.!,]/g, "");

      const cacheKey = `${userId}:${userRole}:${normalizedMessage}`;
      const cached = this.responseCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        yield { type: "token", content: cached.reply };
        yield { type: "done" };
        return;
      }

      // 2. Fetch or initialize the conversation history
      let conversation;
      if (conversationId) {
        conversation = await this.aiRepo.getConversation(conversationId, userId);
        if (!conversation) {
          yield { type: "error", content: "Conversation non trouvée" };
          return;
        }
      } else {
        conversation = await this.aiRepo.createConversation(userId);
        yield {
          type: "conversation",
          conversationId: conversation._id.toString()
        };
      }

      // 3. Persist the user message to the database immediately
      await this.aiRepo.addMessage(conversation._id.toString(), "user", message);
      yield { type: "thinking", content: "Analyse de la demande..." };

      // 4. Provision secure, relevant tools and bind them to the runtime instance
      const runtimeTools = this.getSecuredRelevantTools(userRole, message);
      const securedModel = (this.model as any).bindTools(runtimeTools);

      // 5. Construct the contextual memory history array (Max 6 messages)
      const MAX_HISTORY_MESSAGES = 6;
      const recentMessages = conversation.messages.slice(-MAX_HISTORY_MESSAGES);
      
      const systemPrompt = getSystemPrompt(userRole) + `
        Tu es l'assistant ADRS.
        Règles:
        - Utilise uniquement les outils nécessaires.
        - N'appelle jamais plusieurs outils si un seul suffit.
        - Si la réponse est déjà dans l'historique, réponds directement.
        - Après récupération des données, réponds immédiatement.
        - Ne montre jamais ton raisonnement.
        - Ne montre jamais <think>.
      `;

      let currentMessages: any[] = [
        new SystemMessage(systemPrompt),
        ...recentMessages.map(msg => {
          if (msg.role === "user") return new HumanMessage(msg.content);
          if (msg.role === "assistant") return new AIMessage(msg.content);
          return new SystemMessage(msg.content);
        }),
        new HumanMessage(message)
      ];

      // 6. Execute the execution loop (ReAct architecture)
      const MAX_ITERATIONS = 5;
      let iterations = 0;

      while (iterations++ < MAX_ITERATIONS) {
        const responseStream = await securedModel.stream(currentMessages);

        let completeAIMessage: any = null;
        let collectedContent = "";
        let hasStreamedThinkingLabel = false;

        // STREAMING FILTER STATE VARIABLES
        let inThinkBlock = false;
        let textBuffer = "";

        for await (const chunk of responseStream) {
          // Accumulate incoming streaming deltas into the core LangChain Message structure
          if (!completeAIMessage) {
            completeAIMessage = chunk;
          } else {
            completeAIMessage = completeAIMessage.concat(chunk);
          }

          // Case A: The LLM is actively outputting conversational text directly
          if (chunk.content && (!completeAIMessage.tool_calls || completeAIMessage.tool_calls.length === 0)) {
            if (!hasStreamedThinkingLabel) {
              yield { type: "thinking", content: "Génération de la réponse..." };
              hasStreamedThinkingLabel = true;
            }

            textBuffer += chunk.content;

            // Process buffer character segments sequentially to detect/suppress tags
            while (textBuffer.length > 0) {
              if (inThinkBlock) {
                const endIdx = textBuffer.indexOf("</think>");
                if (endIdx !== -1) {
                  // Found the end of reasoning. Slice past it and resume normal output
                  textBuffer = textBuffer.slice(endIdx + 8);
                  inThinkBlock = false;
                } else {
                  // Still inside a think block. Check if the buffer ends with a partial "</think"
                  let partialMatch = false;
                  const closingTag = "</think>";
                  for (let i = closingTag.length - 1; i > 0; i--) {
                    if (textBuffer.endsWith(closingTag.slice(0, i))) {
                      textBuffer = textBuffer.slice(-i); // Keep only the partial match segment
                      partialMatch = true;
                      break;
                    }
                  }
                  if (!partialMatch) {
                    textBuffer = ""; // Discard everything else safely
                  }
                  break; // Break loop to await more streaming chunks
                }
              } else {
                // Outside of a think block
                const startIdx = textBuffer.indexOf("<think>");
                if (startIdx !== -1) {
                  // Found a reasoning start block. Yield everything prior to it
                  const contentToYield = textBuffer.slice(0, startIdx);
                  if (contentToYield) {
                    collectedContent += contentToYield;
                    yield { type: "token", content: contentToYield };
                  }
                  textBuffer = textBuffer.slice(startIdx + 7);
                  inThinkBlock = true;
                } else {
                  // No complete opening tag found. Safeguard against split tags like "<th" at the end of a chunk
                  let partialMatch = false;
                  const openingTag = "<think>";
                  for (let i = openingTag.length - 1; i > 0; i--) {
                    if (textBuffer.endsWith(openingTag.slice(0, i))) {
                      const safeToYield = textBuffer.slice(0, -i);
                      if (safeToYield) {
                        collectedContent += safeToYield;
                        yield { type: "token", content: safeToYield };
                      }
                      textBuffer = textBuffer.slice(-i); // Retain partial tag in buffer
                      partialMatch = true;
                      break;
                    }
                  }
                  if (!partialMatch) {
                    // Buffer is clean and free of tags. Safe to flush completely to client UI
                    collectedContent += textBuffer;
                    yield { type: "token", content: textBuffer };
                    textBuffer = "";
                  }
                  break;
                }
              }
            }
          }
        }

        // Append the final compiled message object into historical context array
        currentMessages.push(completeAIMessage);

        // Case B: No tool processing needed – generation complete!
        if (!completeAIMessage.tool_calls || completeAIMessage.tool_calls.length === 0) {
          this.responseCache.set(cacheKey, {
            reply: collectedContent,
            timestamp: Date.now()
          });

          await this.aiRepo.addMessage(
            conversation._id.toString(),
            "assistant",
            collectedContent
          );

          yield { type: "done" };
          return;
        }

        // Case C: The LLM requested execution of one or multiple tools
        yield { type: "thinking", content: "Consultation des données..." };

        for (const toolCall of completeAIMessage.tool_calls) {
          const tool: any = runtimeTools.find(t => t.name === toolCall.name);

          if (!tool) {
            currentMessages.push(
              new ToolMessage({
                content: `Erreur: L'accès à l'outil '${toolCall.name}' vous est refusé.`,
                tool_call_id: toolCall.id
              })
            );
            continue;
          }

          try {
            const toolCacheKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
            const cachedTool = this.toolResultCache.get(toolCacheKey);
            
            let result: string;

            if (cachedTool && (Date.now() - cachedTool.timestamp < this.CACHE_TTL)) {
              result = cachedTool.result;
            } else {
              const rawResult = await tool.invoke(toolCall.args);
              result = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
              
              this.toolResultCache.set(toolCacheKey, {
                result,
                timestamp: Date.now()
              });
            }

            currentMessages.push(
              new ToolMessage({
                content: result,
                tool_call_id: toolCall.id
              })
            );

          } catch (error: any) {
            currentMessages.push(
              new ToolMessage({
                content: `Erreur exécutant l'outil ${toolCall.name}: ${error.message}`,
                tool_call_id: toolCall.id
              })
            );
          }
        }
      }

      yield { type: "error", content: "Nombre maximal d'itérations atteint." };

    } catch (error: any) {
      console.error("CHAT STREAM ERROR:", error);
      yield {
        type: "error",
        content: error?.message ?? "Erreur inconnue"
      };
    }
  }

  async *sendMessageStreamOld(
    userId: string,
    conversationId: string | null,
    message: string,
    userRole: string
  ): AsyncGenerator<StreamEvent> {

    try {

      //
      // CACHE CHECK
      //
      // const cacheKey = `${userId}:${userRole}:${message}`;
      const normalizedMessage =
        message
          .trim()
          .toLowerCase()
          .replace(/[?.!,]/g, "");

      const cacheKey =
        `${userId}:${userRole}:${normalizedMessage}`;

      const cached =
        this.responseCache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp <
          this.CACHE_TTL
      ) {

        yield {
          type: "token",
          content: cached.reply
        };

        yield {
          type: "done",
          // conversationId: conversationId ?? ""
        };

        return;
      }

      //
      // CONVERSATION
      //
      let conversation;

      if (conversationId) {

        conversation = await this.aiRepo.getConversation(
            conversationId,
            userId
          );

        if (!conversation) {

          yield {
            type: "error",
            content: "Conversation non trouvée"
          };

          return;
        }

      } else {

        conversation =
          await this.aiRepo.createConversation(
            userId
          );

          yield {
            type: "conversation",
            conversationId: conversation._id.toString()
          };
      }

      //
      // SAVE USER MESSAGE
      //
      await this.aiRepo.addMessage(
        conversation._id.toString(),
        "user",
        message
      );

      //
      // EVENT 1
      //
      yield {
        type: "thinking",
        content:
          "Analyse de la demande..."
      };

      // const tools = getAllTools();
      const tools = this.getSecuredRelevantTools(userRole, message);

      // console.log(
      //   "TOOLS COUNT:",
      //   tools.length
      // );

      // console.log(
      //   "TOOLS:",
      //   tools.map(
      //     t => t.name
      //   )
      // );

      // const MAX_HISTORY_MESSAGES = 20;
      const MAX_HISTORY_MESSAGES = 6;

      const recentMessages =
        conversation.messages.slice(
          -MAX_HISTORY_MESSAGES
        );

      const systemPrompt =
        getSystemPrompt(userRole) +
        `
          Tu es l'assistant ADRS.

          Règles:

          - Utilise uniquement les outils nécessaires.
          - N'appelle jamais plusieurs outils si un seul suffit.
          - Si la réponse est déjà dans l'historique, réponds directement.
          - Après récupération des données, réponds immédiatement.
          - Ne montre jamais ton raisonnement.
          - Ne montre jamais <think>.
        `;

      let currentMessages: any[] = [

        new SystemMessage(
          systemPrompt
        ),

        ...recentMessages.map(msg => {

          if (
            msg.role === "user"
          ) {
            return new HumanMessage(
              msg.content
            );
          }

          if (
            msg.role === "assistant"
          ) {
            return new AIMessage(
              msg.content
            );
          }

          return new SystemMessage(
            msg.content
          );
        }),

        new HumanMessage(
          message
        )
      ];

      const MAX_ITERATIONS = 5;

      let iterations = 0;

      //
      // TOOL PHASE
      //
      while (
        iterations++ <
        MAX_ITERATIONS
      ) {

        console.log("Inside while loop - iteration: ", iterations);

        const response =
          await this.modelWithTools.invoke(
            currentMessages
          );

        currentMessages.push(
          response
        );

        //
        // NO TOOL CALLS
        //
        if (
          !response.tool_calls ||
          response.tool_calls.length === 0
        ) {

          //
          // EVENT 3
          //
          yield {
            type: "thinking",
            content:
              "Génération de la réponse..."
          };

          //
          // RESPONSE ALREADY GENERATED
          //
          const finalResponse = typeof response.content ==="string"
            ? response.content
            : String(
                response.content
              );

          //
          // Simulated streaming
          //
          const chunks =
            finalResponse.match(
              /.{1,80}/gs
            ) ?? [finalResponse];

          for (const chunk of chunks) {

            yield {
              type: "token",
              content: chunk
            };

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  10
                )
            );
          }

          //
          // CACHE
          //
          this.responseCache.set(
            cacheKey,
            {
              reply:
                finalResponse,
              timestamp:
                Date.now()
            }
          );

          //
          // SAVE ASSISTANT
          //
          await this.aiRepo.addMessage(
            conversation._id.toString(),
            "assistant",
            finalResponse
          );

          yield {
            type: "done",
          } as any;

          return;
        }

        //
        // EVENT 2
        //
        yield {
          type: "thinking",
          content:
            "Consultation des données..."
        };

        //
        // EXECUTE TOOLS
        //
        for (const toolCall of response.tool_calls) {

          const tool: any = tools.find(t => t.name === toolCall.name);

          if (!tool) {
            continue;
          }

          try {

            const toolCacheKey =
              `${toolCall.name}:${JSON.stringify(
                toolCall.args
              )}`;

            const cachedTool =
              this.toolResultCache.get(
                toolCacheKey
              );

            let result: any;

            if (
              cachedTool &&
              Date.now() -
                cachedTool.timestamp <
                this.CACHE_TTL
            ) {

              result =
                cachedTool.result;

            } else {

              result =
                await tool.invoke(
                  toolCall.args
                );

              this.toolResultCache.set(
                toolCacheKey,
                {
                  result,
                  timestamp:
                    Date.now()
                }
              );
            }

            currentMessages.push(
              new ToolMessage({
                content:
                  typeof result ===
                  "string"
                    ? result
                    : JSON.stringify(
                        result
                      ),
                tool_call_id:
                  toolCall.id
              })
            );

          } catch (error: any) {

            currentMessages.push(
              new ToolMessage({
                content:
                  `Erreur outil ${toolCall.name}: ${error.message}`,
                tool_call_id:
                  toolCall.id
              })
            );
          }
        }
      }

      yield {
        type: "error",
        content:
          "Nombre maximal d'itérations atteint."
      };

    } catch (error: any) {

      console.error(
        "CHAT STREAM ERROR:",
        error
      );

      yield {
        type: "error",
        content:
          error?.message ??
          "Erreur inconnue"
      };
    }
  }

  async getConversationHistory(userId: string, conversationId: string) {
    const conv = await this.aiRepo.getConversation(conversationId, userId);
    if (!conv) throw new AppError('Conversation non trouvée', 404);
    return conv.messages;
  }

  async deleteConversation(conversationId: string) {
    await this.aiRepo.deleteConversationById(conversationId);
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

    let messages: any = [new SystemMessage(systemPrompt), new HumanMessage(query)];
    let finalResponse = null;

    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations++ < MAX_ITERATIONS) {
    // while (true) {
      const response = await modelWithTools.invoke(messages);
      messages.push(response);
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          const tool: any = tools.find(t => t.name === toolCall.name);
          if (tool) {
            try {
              const result: any = await tool.invoke(toolCall.args);
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

  async *generateFlexibleReportStream(
    userId: string,
    userRole: string,
    query = "Générer un rapport"
  ): AsyncGenerator<ReportStreamEvent> {

    try {

      if (userRole !== "admin") {
        throw new AppError(
          "Seuls les administrateurs peuvent générer des rapports",
          403
        );
      }

      //
      // EVENT 1
      //
      yield {
        type: "thinking",
        message: "Analyse de la demande..."
      };

      const tools = getAllTools();

      const modelWithTools =
        (this.model as ToolBindableModel)
          .bindTools(tools);

      const systemPrompt = `
        Tu es un assistant de reporting exécutif.

        Utilise les outils nécessaires afin de récupérer
        les données nécessaires.

        Une fois les données récupérées :

        - Génère un rapport professionnel
        - Réponds en français
        - Utilise Markdown
        - Utilise des tableaux lorsque pertinent
        - N'affiche jamais <think>
        - N'explique jamais ton raisonnement
        - N'explique jamais les appels d'outils
        - N'invente aucune donnée

        Demande :

        "${query}"
      `;

      let messages: any[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(query)
      ];

      //
      // EVENT 2
      //
      yield {
        type: "thinking",
        message: "Consultation des données..."
      };

      const MAX_ITERATIONS = 5;

      let iterations = 0;

      let finalResponse: string | null = null;

      while (iterations++ < MAX_ITERATIONS) {

        const response =
          await modelWithTools.invoke(
            messages
          );

        messages.push(response);

        //
        // REPORT READY
        //
        if (
          !response.tool_calls ||
          response.tool_calls.length === 0
        ) {

          finalResponse =
            typeof response.content === "string"
              ? response.content
              : String(response.content);

          break;
        }

        //
        // EXECUTE TOOLS
        //
        for (const toolCall of response.tool_calls) {

          const tool: any = tools.find(t => t.name === toolCall.name);

          if (!tool) {
            continue;
          }

          try {

            const result =
              await tool.invoke(
                toolCall.args
              );

            messages.push(
              new ToolMessage({
                content:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result),
                tool_call_id:
                  toolCall.id
              })
            );

          } catch (error: any) {

            messages.push(
              new ToolMessage({
                content:
                  `Erreur outil ${toolCall.name}: ${error.message}`,
                tool_call_id:
                  toolCall.id
              })
            );
          }
        }
      }

      if (!finalResponse) {

        throw new Error(
          "Impossible de générer le rapport."
        );
      }

      //
      // EVENT 3
      //
      yield {
        type: "thinking",
        message: "Rédaction du rapport..."
      };

      //
      // Save report
      //
      await this.aiRepo.saveReport(
        userId,
        "custom",
        finalResponse
      );

      //
      // Simulated streaming
      //
      const chunks =
        finalResponse.match(
          /.{1,120}/gs
        ) ?? [finalResponse];

      for (const chunk of chunks) {

        yield {
          type: "token",
          content: chunk
        };

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              15
            )
        );
      }

      //
      // DONE
      //
      yield {
        type: "done",
        report: finalResponse
      };

    } catch (error: any) {

      console.error(
        "REPORT STREAM ERROR:",
        error
      );

      yield {
        type: "error",
        message:
          error?.message ??
          "Erreur inconnue"
      };
    }
  }

  async getUserReports(userId: string) {
    return this.aiRepo.getUserReports(userId);
  }

  
  async deleteReport(reportId: string) {
    await this.aiRepo.deleteReportById(reportId);
  }
}