import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface IAiProvider {
  getModel(): BaseChatModel;
}

// export interface ChatMessage {
//   role: 'system' | 'user' | 'assistant';
//   content: string;
// }

// export interface IAiProvider {
//   chat(messages: ChatMessage[], options?: { temperature?: number }): Promise<string>;
//   generate(prompt: string, options?: { temperature?: number }): Promise<string>;
// }