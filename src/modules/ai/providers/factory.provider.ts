import { IAiProvider } from './base.provider.js';
import { OpenAiProvider } from './openai.provider.js';
import { DeepSeekProvider } from './deepseek.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { OllamaProvider } from './ollama.provider.js';

export class AiProviderFactory {
  static create(provider: 'openai' | 'deepseek' | 'gemini' | 'ollama'): IAiProvider {
    switch (provider) {
      case 'openai':
        return new OpenAiProvider(process.env.OPENAI_API_KEY!);
      case 'deepseek':
        return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY!);
      case 'gemini':
        return new GeminiProvider(process.env.GEMINI_API_KEY!);
      case 'ollama':
        return new OllamaProvider();
      default:
        throw new Error(`Fournisseur AI non supporté: ${provider}`);
    }
  }
}