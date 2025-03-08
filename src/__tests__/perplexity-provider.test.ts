import { expect, test, describe, beforeEach } from 'bun:test';
import { PerplexityProvider } from '../providers/perplexity-provider';
import { AICompletionRequest } from '../types/ai-provider';

const hasPerplexityKey = !!process.env.PERPLEXITY_API_KEY;

describe('PerplexityProvider', () => {
  let provider: PerplexityProvider;

  beforeEach(() => {
    provider = new PerplexityProvider(process.env.PERPLEXITY_API_KEY || 'test-api-key');
  });

  (hasPerplexityKey ? describe : describe.skip)('getCompletion', () => {
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
      expect(response.model).toBe('sonar');
    }, 10000);

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('perplexity');
    });

    test('handles custom temperature and max tokens', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('provider', 'perplexity');
    }, 10000); // Increase timeout to 10 seconds

    test('includes usage statistics in response', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        show_stats: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    }, 10000);

    test('throws error for invalid API key', async () => {
      const invalidProvider = new PerplexityProvider('invalid-key');
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(invalidProvider.getCompletion(request)).rejects.toThrow();
    });

    // test('handles input_file in request', async () => {
    //   const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
    //   const bunFile = Bun.file(testImagePath);
    //   const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
    //     type: 'image/png',
    //   });
    //   const request: AICompletionRequest = {
    //     messages: [{ role: 'user', content: 'Describe this image' }],
    //     input_file: imageFile,
    //   };

    //   const response = await provider.getCompletion(request);
    //   expect(response.provider).toBe('perplexity');
    //   expect(response.content).toBeTruthy();
    // }, 10000); // Increase timeout to 10 seconds for image processing
  });

  (hasPerplexityKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'perplexity');
    });

    // test('handles input_file in stream request', async () => {
    //   const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
    //   const bunFile = Bun.file(testImagePath);
    //   const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
    //     type: 'image/png',
    //   });
    //   const request: AICompletionRequest = {
    //     messages: [{ role: 'user', content: 'Describe this image' }],
    //     input_file: imageFile,
    //   };

    //   const generator = provider.getCompletionStream(request);
    //   const firstChunk = (await generator.next()).value;

    //   expect(firstChunk).toHaveProperty('content');
    //   expect(firstChunk).toHaveProperty('provider', 'perplexity');
    // });

    test('handles streaming with multiple messages', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toBeDefined();
      expect(firstChunk).toHaveProperty('content');
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
    expect(models.text?.length).toBeGreaterThan(0);
    expect(models.text).toContain('sonar');
    expect(models.text).toContain('sonar-pro');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.text).toContain('sonar');
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
    expect(provider.name).toBe('perplexity');
  });

  test('constructor sets API key', () => {
    const testKey = 'test-api-key';
    const testProvider = new PerplexityProvider(testKey);
    expect(testProvider).toBeInstanceOf(PerplexityProvider);
  });
});
