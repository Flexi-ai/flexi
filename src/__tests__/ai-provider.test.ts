import { expect, test, describe } from 'bun:test';
import {
  AIMessage,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '../types/ai-provider';
import { ClaudeProvider } from '../providers/claude-provider';
import { OpenAIProvider } from '../providers/openai-provider';

// Mock Anthropic SDK
class MockAnthropicStream
  implements AsyncIterable<{ type: string; delta: { type: string; text: string } }>
{
  async *[Symbol.asyncIterator]() {
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } };
  }
}

// Mock OpenAI SDK
class MockOpenAIStream
  implements AsyncIterable<{ choices: Array<{ delta: { content: string } }>; model: string }>
{
  async *[Symbol.asyncIterator]() {
    yield { choices: [{ delta: { content: 'Hello' } }], model: 'gpt-3.5-turbo' };
    yield { choices: [{ delta: { content: ' World' } }], model: 'gpt-3.5-turbo' };
  }
}

describe('AI Provider Types', () => {
  describe('Streaming Support', () => {
    test('AIStreamChunk structure', () => {
      const chunk: AIStreamChunk = {
        content: 'Test chunk',
        model: 'test-model',
        provider: 'test-provider',
      };

      expect(chunk.content).toBe('Test chunk');
      expect(chunk.model).toBe('test-model');
      expect(chunk.provider).toBe('test-provider');
    });

    test('ClaudeProvider streaming implementation', async () => {
      const provider = new ClaudeProvider('test-api-key');
      const mockClient = {
        messages: {
          create: () => Promise.resolve(new MockAnthropicStream()),
        },
      };
      (provider as unknown as { client: typeof mockClient }).client = mockClient;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 100,
      };

      const stream = provider.getCompletionStream(request);
      const chunks: AIStreamChunk[] = [];

      for await (const chunk of stream) {
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('model');
        expect(chunk).toHaveProperty('provider');
        expect(typeof chunk.content).toBe('string');
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(chunk => chunk.provider === 'claude')).toBe(true);
      expect(chunks.every(chunk => chunk.model === request.model)).toBe(true);
    });

    test('OpenAIProvider streaming implementation', async () => {
      const provider = new OpenAIProvider('test-api-key');
      const mockClient = {
        chat: {
          completions: {
            create: () => Promise.resolve(new MockOpenAIStream()),
          },
        },
      };
      (provider as unknown as { client: typeof mockClient }).client = mockClient;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
      };

      const stream = provider.getCompletionStream(request);
      const chunks: AIStreamChunk[] = [];

      for await (const chunk of stream) {
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('model');
        expect(chunk).toHaveProperty('provider');
        expect(typeof chunk.content).toBe('string');
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(chunk => chunk.provider === 'openai')).toBe(true);
      expect(chunks.every(chunk => chunk.model === request.model)).toBe(true);
    });

    test('ClaudeProvider streaming error handling', async () => {
      const provider = new ClaudeProvider('invalid-api-key');
      const mockClient = {
        messages: {
          create: () => Promise.reject(new Error('Authentication failed')),
        },
      };
      (provider as unknown as { client: typeof mockClient }).client = mockClient;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'claude-3-sonnet-20240229',
      };

      const stream = provider.getCompletionStream(request);
      await expect(stream.next()).rejects.toThrow('Authentication failed');
    });

    test('OpenAIProvider streaming error handling', async () => {
      const provider = new OpenAIProvider('invalid-api-key');
      const mockClient = {
        chat: {
          completions: {
            create: () => Promise.reject(new Error('Authentication failed')),
          },
        },
      };
      (provider as unknown as { client: typeof mockClient }).client = mockClient;

      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'gpt-3.5-turbo',
      };

      const stream = provider.getCompletionStream(request);
      await expect(stream.next()).rejects.toThrow('Authentication failed');
    });
  });

  test('AIMessage structure', () => {
    const message: AIMessage = {
      role: 'user',
      content: 'Hello, AI!',
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello, AI!');
  });

  test('AICompletionRequest structure', () => {
    const request: AICompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Test message',
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
      model: 'test-model',
    };

    expect(request.messages).toHaveLength(1);
    expect(request.temperature).toBe(0.7);
    expect(request.maxTokens).toBe(100);
    expect(request.model).toBe('test-model');
  });

  test('AICompletionResponse structure', () => {
    const response: AICompletionResponse = {
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    expect(response.content).toBe('Test response');
    expect(response.model).toBe('test-model');
    expect(response.provider).toBe('test-provider');
    expect(response.usage?.totalTokens).toBe(30);
  });
});
