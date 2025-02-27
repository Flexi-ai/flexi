import { OpenAI } from 'openai';
import { AICompletionRequest, AICompletionResponse, AIProvider } from '../types/ai-provider';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  name = 'openai';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const completion = await this.client.chat.completions.create({
      model: request.model || 'gpt-3.5-turbo',
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
    });

    return {
      content: completion.choices[0].message.content || '',
      model: completion.model,
      provider: this.name,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return [
      'o1',
      'o1-mini',
      'o3-mini',
      'chatgpt-4o-latest',
      'gpt-3.5-turbo-instruct',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-4o',
      'gpt-4o-mini',
    ];
  }
}
