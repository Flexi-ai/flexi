import { expect, test, describe, beforeEach } from 'bun:test';
import { OpenAIProvider } from '../providers/openai-provider';
import { AICompletionRequest } from '../types/ai-provider';

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider(process.env.OPENAI_API_KEY || 'test-api-key');
  });

  (hasOpenAIKey ? describe : describe.skip)('getCompletion', () => {
    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('gpt-3.5-turbo-0125');
    });

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
    });
  });

  (hasOpenAIKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'openai');
    });
  });

  (hasOpenAIKey ? describe : describe.skip)('listAvailableModels', () => {
    test('returns array of model names', async () => {
      const models = await provider.listAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-3.5-turbo');
    });
  });
});
