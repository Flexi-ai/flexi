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

  private validateImageFile(file: File): void {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !imageExtensions.includes(`.${fileExtension}`)) {
      throw new Error('Deepseek only supports image files (PNG, JPG, JPEG, and WEBP)');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Deepseek only supports image files (PNG, JPG, JPEG, and WEBP)');
    }
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    let messages = request.messages;
    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      messages = [
        ...messages,
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Content}` },
            },
          ],
        },
      ];
    }

    const stream = await this.client.chat.completions.create({
      model: request.model || 'deepseek-chat',
      messages: messages.map(msg => ({
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

    let messages = request.messages;
    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      messages = [
        ...messages,
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Content}` },
            },
          ],
        },
      ];
    }

    const completion = await this.client.chat.completions.create({
      model: request.model || 'deepseek-chat',
      messages: messages.map(msg => ({
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
