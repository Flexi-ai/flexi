import { expect, test, describe } from "bun:test";
import { AIMessage, AICompletionRequest, AICompletionResponse } from "../types/ai-provider";

describe('AI Provider Types', () => {
  test('AIMessage structure', () => {
    const message: AIMessage = {
      role: 'user',
      content: 'Hello, AI!'
    };
    
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello, AI!');
  });

  test('AICompletionRequest structure', () => {
    const request: AICompletionRequest = {
      messages: [{
        role: 'user',
        content: 'Test message'
      }],
      temperature: 0.7,
      maxTokens: 100,
      model: 'test-model'
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
        totalTokens: 30
      }
    };

    expect(response.content).toBe('Test response');
    expect(response.model).toBe('test-model');
    expect(response.provider).toBe('test-provider');
    expect(response.usage?.totalTokens).toBe(30);
  });
}));