import { Anthropic } from '@anthropic-ai/sdk';
import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

export class ClaudeProvider extends AIProviderBase {
  private client: Anthropic;
  name = 'claude';

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  private validateImageFile(file: File): void {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !imageExtensions.includes(`.${fileExtension}`)) {
      throw new Error('Claude only supports image files (PNG, JPG, JPEG, and WEBP)');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Claude only supports image files (PNG, JPG, JPEG, and WEBP)');
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
              type: 'image',
              source: {
                type: 'base64',
                media_type: request.input_file.type,
                data: base64Content,
              },
            },
          ],
        },
      ];
    }

    const stream = await this.client.messages.create({
      model: request.model || 'claude-3-5-sonnet-20241022',
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    });

    let promptTokens = null;
    let completionTokens = 0;

    if (request.show_stats && !request.stream) {
      promptTokens = { totalTokens: this.countMessageTokens(request.messages) };
    }

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        const chunkText = chunk.delta.text || '';
        if (request.show_stats && !request.stream) {
          completionTokens += this.countMessageTokens([{ content: chunkText }]);
        }

        yield {
          content: chunkText,
          model: request.model || 'claude-3-5-sonnet-20241022',
          provider: this.name,
          usage:
            request.show_stats && !request.stream
              ? {
                  promptTokens: promptTokens?.totalTokens,
                  completionTokens,
                  totalTokens: (promptTokens?.totalTokens || 0) + completionTokens,
                }
              : undefined,
        };
      }
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
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
              type: 'image',
              source: {
                type: 'base64',
                media_type: request.input_file.type,
                data: base64Content,
              },
            },
          ],
        },
      ];
    }

    const completion = await this.client.messages.create({
      model: request.model || 'claude-3-5-sonnet-20241022',
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
    });
    let promptTokens = null;
    let completionTokens = 0;

    if (request.show_stats) {
      promptTokens = { totalTokens: this.countMessageTokens(request.messages) };
      completionTokens = this.countMessageTokens([
        { content: completion.content[0].type === 'text' ? completion.content[0].text : '' },
      ]);
    }

    return {
      content: completion.content[0].type === 'text' ? completion.content[0].text : '',
      model: completion.model,
      provider: this.name,
      usage: request.show_stats
        ? {
            promptTokens: promptTokens?.totalTokens,
            completionTokens,
            totalTokens: (promptTokens?.totalTokens || 0) + completionTokens,
          }
        : undefined,
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return [
      'claude-3-7-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-latest',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20241022',
    ];
  }
}
