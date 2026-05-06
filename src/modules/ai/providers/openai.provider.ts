import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { IAiProvider } from './base.provider.js';

export class OpenAiProvider implements IAiProvider {
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName = "gpt-4o", temperature = 0) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature,
    });
  }

  getModel(): BaseChatModel {
    return this.model;
  }
}