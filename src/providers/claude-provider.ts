import { Anthropic } from '@anthropic-ai/sdk';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AIProvider,
} from '../types/ai-provider';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  name = 'claude';

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const stream = await this.client.messages.create({
      model: request.model || 'claude-3-sonnet-20240229',
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield {
          content: chunk.delta.text || '',
          model: request.model || 'claude-3-sonnet-20240229',
          provider: this.name,
        };
      }
    }
  }

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const completion = await this.client.messages.create({
      model: request.model || 'claude-3-opus-20240229',
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature,
    });

    return {
      content: completion.content[0].type === 'text' ? completion.content[0].text : '',
      model: completion.model,
      provider: this.name,
      usage: {
        promptTokens: completion.usage?.input_tokens,
        completionTokens: completion.usage?.output_tokens,
        totalTokens: (completion.usage?.input_tokens || 0) + (completion.usage?.output_tokens || 0),
      },
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }
}
