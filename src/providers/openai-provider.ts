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
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
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
    const models = await this.client.models.list();
    return models.data
      .filter(model => model.id.startsWith('gpt'))
      .map(model => model.id);
  }
}