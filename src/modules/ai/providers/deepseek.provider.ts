import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { IAiProvider } from './base.provider.js';

export class DeepSeekProvider implements IAiProvider {
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName = "deepseek-chat", temperature = 0) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature,
      configuration: {
        baseURL: "https://api.deepseek.com/v1",
      },
    });
  }

  getModel(): BaseChatModel {
    return this.model;
  }
}