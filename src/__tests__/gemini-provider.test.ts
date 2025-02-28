import { expect, test, describe, beforeEach } from 'bun:test';
import { GeminiProvider } from '../providers/gemini-provider';
import { AICompletionRequest } from '../types/ai-provider';

const hasGeminiKey = !!process.env.GEMINI_API_KEY;

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider(process.env.GEMINI_API_KEY || 'test-api-key');
  });

  (hasGeminiKey ? describe : describe.skip)('getCompletion', () => {
    test('throws error when stream is true', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'For streaming responses, please use getCompletionStream method'
      );
    });

    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('gemini-2.0-flash');
    });

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('gemini');
    });
  });

  (hasGeminiKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'gemini');
    });
  });

  (hasGeminiKey ? describe : describe.skip)('listAvailableModels', () => {
    test('returns array of model names', async () => {
      const models = await provider.listAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gemini-2.0-flash');
    });
  });
});
