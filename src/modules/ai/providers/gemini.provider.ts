import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { IAiProvider } from './base.provider.js';

export class GeminiProvider implements IAiProvider {
  private model: ChatGoogleGenerativeAI; 

  constructor(apiKey: string, modelName = "gemini-2.5-flash", temperature = 0) {
  // constructor(apiKey: string, modelName = "gemini-2.0-flash-exp", temperature = 0) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      modelName,         // ✅ correct property name (NOT "model")
      temperature,
      maxOutputTokens: 2048, // optional but recommended
    } as any);
  }

  getModel(): BaseChatModel {
    return this.model;
  }
}

// curl -X GET "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCRL4NkQeWyTOH4Dx76DU9nWJF2-lZIJSI"

// Available Gemini models (as of 2024-06):
// gemini-2.5-flash (recommended for speed/cost)
// gemini-2.5-pro (more capable)
// gemini-2.0-flash (stable)
// gemini-2.0-flash-001
// gemini-flash-latest (always points to latest)