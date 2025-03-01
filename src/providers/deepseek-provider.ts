import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from '../types/ai-provider';
import { AIProviderBase } from './base-provider';
import OpenAI from 'openai';

export class DeepseekProvider extends AIProviderBase {
  private client: OpenAI;
  name = 'deepseek';

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: apiKey,
    });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: request.model || 'deepseek-chat',
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield {
          content,
          model: chunk.model,
          provider: this.name,
        };
      }
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }

    const completion = await this.client.chat.completions.create({
      model: request.model || 'deepseek-chat',
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      model: completion.model,
      provider: this.name,
      usage:
        request.show_stats && completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return ['deepseek-chat', 'deepseek-reasoner'];
  }
}
