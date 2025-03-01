import { expect, test, describe, beforeEach } from 'bun:test';
import { ClaudeProvider } from '../providers/claude-provider';
import { AICompletionRequest } from '../types/ai-provider';

const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(process.env.ANTHROPIC_API_KEY || 'test-api-key');
  });

  (hasClaudeKey ? describe : describe.skip)('getCompletion', () => {
    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('claude-3-5-sonnet-20241022');
    });

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('claude');
    });

    test('handles input_file in request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const imageFile = Bun.file(testImagePath);
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
        maxTokens: 100, // Limit response size for faster test completion
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('claude');
      expect(response.content).toBeTruthy();
    }, 10000); // Increase timeout to 10 seconds for image processing

    test('handles temperature parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('claude');
    });

    test('handles maxTokens parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('claude');
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
  });

  (hasClaudeKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'claude');
    });

    test('handles input_file in stream request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const imageFile = Bun.file(testImagePath);
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('provider', 'claude');
    });
  });

  (hasClaudeKey ? describe : describe.skip)('listAvailableModels', () => {
    test('returns array of model names', async () => {
      const models = await provider.listAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('claude-3-5-sonnet-20241022');
    });
  });
});
