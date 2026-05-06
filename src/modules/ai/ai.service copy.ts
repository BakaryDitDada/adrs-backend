// src/modules/ai/ai.service.ts
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { AiRepository } from './ai.repository.js';
import { getSystemPrompt } from './prompts/system.prompts.js';
import { getAllTools, injectRepositories } from './tools/index.js';
import AppError from '../../utils/appError.js';
import { EmployeeRepository } from '../employees/employees.repository.js';
import { LeavesRepository } from '../leaves/leaves.repository.js';
import { ProjectRepository } from '../projects/projects.repository.js';
import { TaskRepository } from '../tasks/tasks.repository.js';

export class AiService {
  private graph: any;
  private aiRepo: AiRepository;

  constructor(
    aiRepo: AiRepository,
    private model: BaseChatModel,
    private employeeRepo: EmployeeRepository,
    private leaveRepo: LeavesRepository,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository
  ) {
    this.aiRepo = aiRepo;
    // Inject repositories into tools
    injectRepositories({
      employeeRepo: this.employeeRepo,
      leaveRepo: this.leaveRepo,
      projectRepo: this.projectRepo,
      taskRepo: this.taskRepo
    });

    const tools = getAllTools();
    const toolNode = new ToolNode(tools);

    // Define the graph
    const graph = new StateGraph(MessagesAnnotation)
      .addNode("agent", async (state: any) => {
        const systemPrompt = getSystemPrompt(state.userRole);
        const messages = [new SystemMessage(systemPrompt), ...state.messages];
        const response = await this.model.invoke(messages);
        return { messages: [response] };
      })
      .addNode("tools", toolNode)
      .addEdge("agent", "tools")
      .addEdge("tools", "agent");

    this.graph = graph.compile();
  }

  async sendMessage(userId: string, conversationId: string | null, message: string, userRole: string) {
    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await this.aiRepo.getConversation(conversationId, userId);
      if (!conversation) throw new AppError('Conversation non trouvée', 404);
    } else {
      conversation = await this.aiRepo.createConversation(userId);
    }

    // Save user message
    await this.aiRepo.addMessage(conversation._id.toString(), 'user', message);

    // Convert history to LangChain message format
    const chatHistory = conversation.messages.map(msg => {
      if (msg.role === 'user') return new HumanMessage(msg.content);
      if (msg.role === 'assistant') return new AIMessage(msg.content);
      return new SystemMessage(msg.content);
    });

    // Invoke the graph
    const result = await this.graph.invoke({
      messages: [...chatHistory, new HumanMessage(message)],
      userRole,
    });

    const reply = result.messages[result.messages.length - 1].content;
    await this.aiRepo.addMessage(conversation._id.toString(), 'assistant', reply);

    return { conversationId: conversation._id.toString(), reply };
  }

  async getConversationHistory(userId: string, conversationId: string) {
    const conv = await this.aiRepo.getConversation(conversationId, userId);
    if (!conv) throw new AppError('Conversation non trouvée', 404);
    return conv.messages;
  }

  async listConversations(userId: string) {
    return this.aiRepo.getUserConversations(userId);
  }

  async generateFlexibleReport(userId: string, userRole: string, query: string): Promise<string> {
    if (userRole !== 'admin') throw new AppError('Seuls les administrateurs peuvent générer des rapports', 403);

    // Create a temporary conversation for report generation
    const systemPrompt = `Tu es un assistant de reporting exécutif. En te basant sur la demande de l'utilisateur, utilise les outils disponibles pour obtenir les données nécessaires et génère un rapport professionnel structuré.
    Demande: "${query}"
    Utilise le format Markdown avec titres et puces. Inclus des sections appropriées (RH, Projets, Tâches, etc.). Réponds en français.`;

    const result = await this.graph.invoke({
      messages: [new SystemMessage(systemPrompt), new HumanMessage(query)],
      userRole,
    });

    const reportContent = result.messages[result.messages.length - 1].content;
    await this.aiRepo.saveReport(userId, 'custom', reportContent);
    return reportContent;
  }

  async getUserReports(userId: string) {
    return this.aiRepo.getUserReports(userId);
  }
}