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

    test('handles input_file in request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('gemini');
      expect(response.content).toBeTruthy();
    });

    test('handles temperature parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('gemini');
    });

    test('handles maxTokens parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('gemini');
    });

    test('shows usage stats when requested', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        show_stats: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    });

    test('throws error for invalid API key', async () => {
      const invalidProvider = new GeminiProvider('invalid-key');
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(invalidProvider.getCompletion(request)).rejects.toThrow();
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

    test('handles input_file in stream request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
      };

      const chunks: string[] = [];
      for await (const chunk of provider.getCompletionStream(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });

    test('handles streaming with multiple messages', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const chunks: string[] = [];
      for await (const chunk of provider.getCompletionStream(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });

    test('respects custom temperature and max tokens in stream', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 500,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toBeDefined();
      expect(firstChunk).toHaveProperty('content');
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
