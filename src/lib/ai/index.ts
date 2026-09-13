import { AIProvider } from './types';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openaiProvider';
import { LocalEngineProvider } from './localEngine';

/**
 * Returns an AI provider configured with either:
 * 1. Server environment key (process.env.GEMINI_API_KEY / process.env.OPENAI_API_KEY)
 * 2. User-provided client key from Settings (clientApiKey)
 * 3. High-intelligence Local Study Engine fallback (offline heuristic synthesis)
 */
export function getAIProvider(clientApiKey?: string, clientProvider?: string): AIProvider {
  // 1. Server-side key takes highest priority
  const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();
  if (serverGeminiKey && serverGeminiKey.length > 8) {
    return new GeminiProvider(serverGeminiKey);
  }

  const serverOpenAIKey = process.env.OPENAI_API_KEY?.trim();
  if (serverOpenAIKey && serverOpenAIKey.length > 8) {
    return new OpenAIProvider(serverOpenAIKey);
  }

  // 2. Client-provided key from Settings modal
  if (clientApiKey && typeof clientApiKey === 'string' && clientApiKey.trim().length > 8) {
    const cleanKey = clientApiKey.trim();
    if (clientProvider === 'openai' || cleanKey.startsWith('sk-')) {
      return new OpenAIProvider(cleanKey);
    }
    return new GeminiProvider(cleanKey);
  }

  // 3. Fallback to Local Study Engine (always succeeds without crashing)
  return new LocalEngineProvider();
}

export * from './types';
export * from './ragEngine';
export * from './localEngine';
export * from './geminiProvider';
export * from './openaiProvider';
