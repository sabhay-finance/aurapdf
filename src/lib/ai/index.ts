import { AIProvider } from './types';
import { GeminiProvider } from './geminiProvider';
import { LocalEngineProvider } from './localEngine';

export function getAIProvider(): AIProvider {
  // Always prioritize real server-side Gemini API key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  }

  // In production, reject unconfigured AI calls rather than returning fake mock responses
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AI provider is not configured on the server. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  // Local development fallback only
  return new LocalEngineProvider();
}

export * from './types';
export * from './ragEngine';
export * from './localEngine';
export * from './geminiProvider';
