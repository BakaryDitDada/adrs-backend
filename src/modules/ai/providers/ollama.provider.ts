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
      baseUrl: "http://localhost:11434"
    });
  }

  getModel(): BaseChatModel {
    return this.model;
  }
}