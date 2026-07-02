import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { IAiProvider } from "./base.provider.js";

export class OllamaProvider implements IAiProvider {
  private model: ChatOllama;

  constructor(
    modelName = "qwen3:latest",
    temperature = 0
  ) {
    this.model = new ChatOllama({
      model: modelName,
      temperature,
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      keepAlive: "1h",
      // LangChain's native top-level request timeout property
      timeout: 120_000, 
    } as any);
  }

  getModel(): BaseChatModel {
    return this.model;
  }
}