import { expect, test, describe, beforeEach, mock, type Mock } from 'bun:test';
import { Hono } from 'hono';
import { AIProvider, AICompletionResponse, AICompletionRequest } from '../types/ai-provider';
import { createCompletionRoutes } from '../routes/completion';

describe('Completion Routes', () => {
  let app: Hono;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = {
      name: 'test-provider',
      getCompletion: mock<(request: AICompletionRequest) => Promise<AICompletionResponse>>(() =>
        Promise.resolve({ content: '', model: '', provider: '' })
      ),
      listAvailableModels: mock(() => ({
        text: ['test-model'],
      })),
    };
    const providers = new Map<string, AIProvider>();
    providers.set('test-provider', mockProvider);
    app = new Hono().route('/completion', createCompletionRoutes(providers));
  });

  test('successful completion request with show_stats omitted', async () => {
    const mockResponse: AICompletionResponse = {
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    (
      mockProvider.getCompletion as Mock<
        (request: AICompletionRequest) => Promise<AICompletionResponse>
      >
    ).mockResolvedValue(mockResponse);

    const req = new Request('http://localhost/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
        model: 'test-model',
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ content: mockResponse.content });
  });

  test('successful completion request with show_stats false', async () => {
    const mockResponse: AICompletionResponse = {
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    (
      mockProvider.getCompletion as Mock<
        (request: AICompletionRequest) => Promise<AICompletionResponse>
      >
    ).mockResolvedValue(mockResponse);

    const req = new Request('http://localhost/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
        model: 'test-model',
        show_stats: false,
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ content: mockResponse.content });
  });

  test('successful completion request with stats', async () => {
    const mockResponse: AICompletionResponse = {
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    (
      mockProvider.getCompletion as Mock<
        (request: AICompletionRequest) => Promise<AICompletionResponse>
      >
    ).mockResolvedValue(mockResponse);

    const req = new Request('http://localhost/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
        model: 'test-model',
        show_stats: true,
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual(mockResponse);
  });

  test('provider not found', async () => {
    const req = new Request('http://localhost/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'non-existent-provider',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
        model: 'test-model',
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data).toEqual({ error: 'Provider not found' });
  });

  test('provider error handling', async () => {
    (
      mockProvider.getCompletion as Mock<
        (request: AICompletionRequest) => Promise<AICompletionResponse>
      >
    ).mockRejectedValue(new Error('Provider error'));

    const req = new Request('http://localhost/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'test-provider',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
        model: 'test-model',
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data).toEqual({ error: 'Provider error' });
  });
});
