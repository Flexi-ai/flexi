import { expect, test, describe, beforeEach } from 'bun:test';
import { DeepseekProvider } from '../providers/deepseek-provider';
import { AICompletionRequest } from '../types/ai-provider';

const hasDeepseekKey = !!process.env.DEEPSEEK_API_KEY;

describe('DeepseekProvider', () => {
  let provider: DeepseekProvider;

  beforeEach(() => {
    provider = new DeepseekProvider(process.env.DEEPSEEK_API_KEY || 'test-api-key');
  });

  (hasDeepseekKey ? describe : describe.skip)('getCompletion', () => {
    test('rejects txt files in input_file', async () => {
      const testTxtPath = new URL('./data-sources/test.txt', import.meta.url);
      const bunFile = Bun.file(testTxtPath);
      const txtFile = new File([await bunFile.arrayBuffer()], 'test.txt', {
        type: 'text/plain',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Read this file' }],
        input_file: txtFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    });

    test('rejects gif files in input_file', async () => {
      const testGifPath = new URL('./data-sources/test.gif', import.meta.url);
      const bunFile = Bun.file(testGifPath);
      const gifFile = new File([await bunFile.arrayBuffer()], 'test.gif', {
        type: 'image/gif',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Analyze this image' }],
        input_file: gifFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    });

    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('deepseek-chat');
    });

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('deepseek');
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
      expect(response.provider).toBe('deepseek');
      expect(response.content).toBeTruthy();
    });

    test('handles temperature parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('deepseek');
    });

    test('handles maxTokens parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('deepseek');
    });

    test('shows usage stats when requested', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    });

    test('throws error for invalid API key', async () => {
      const invalidProvider = new DeepseekProvider('invalid-key');
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(invalidProvider.getCompletion(request)).rejects.toThrow();
    });
  });

  (hasDeepseekKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'deepseek');
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

  test('returns available models with correct structure', async () => {
    const models = await provider.listAvailableModels();
    expect(models).toHaveProperty('text');
    expect(Array.isArray(models.text)).toBe(true);
    expect(models.text.length).toBeGreaterThan(0);
    expect(models.text).toContain('deepseek-chat');
    expect(models.text).toContain('deepseek-reasoner');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.text).toContain('deepseek-chat');
  });

  test('throws error for invalid model', async () => {
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'invalid-model',
    };

    await expect(provider.getCompletion(request)).rejects.toThrow(
      'Invalid model used. Use /provider/models api to know which models are supported'
    );
  });

  test('provider name is set correctly', () => {
    expect(provider.name).toBe('deepseek');
  });

  test('constructor sets API key', () => {
    const testKey = 'test-api-key';
    const testProvider = new DeepseekProvider(testKey);
    // We can't directly test private fields, but we can test the provider was created
    expect(testProvider).toBeInstanceOf(DeepseekProvider);
  });
});
