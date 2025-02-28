import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AIProvider,
} from '../types/ai-provider';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  name = 'gemini';

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = this.client.getGenerativeModel({ model: request.model || 'gemini-2.0-flash' });
    const result = await model.generateContentStream({
      contents: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: request?.temperature || 0.7,
        maxOutputTokens: request?.maxTokens || 1000,
      },
    });
    for await (const chunk of result.stream) {
      yield {
        content: chunk.text(),
        model: request.model || 'gemini-2.0-flash',
        provider: this.name,
        usage: {
          promptTokens: undefined,
          completionTokens: undefined,
          totalTokens: undefined,
        },
      };
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }
    const model = this.client.getGenerativeModel({ model: request.model || 'gemini-2.0-flash' });
    const result = await model.generateContentStream({
      contents: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: request?.temperature || 0.7,
        maxOutputTokens: request?.maxTokens || 1000,
      },
    });
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
    }
    return {
      content: fullText,
      model: request.model || 'gemini-2.0-flash',
      provider: this.name,
      usage: {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      },
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];
  }
}
