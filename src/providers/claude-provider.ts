import { Anthropic } from '@anthropic-ai/sdk';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

type AIImageMessage = {
  role: 'user';
  content: {
    type: 'image';
    source: {
      type: 'base64';
      media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      data: string;
    };
  }[];
};

const isValidImageFileType = (type: string) => {
  return (
    type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/webp'
  );
};

export class ClaudeProvider extends AIProviderBase {
  private client: Anthropic;
  name = 'claude';

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;
    if (request.input_file && isValidImageFileType(request.input_file.type)) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      updatedMessages = [
        ...updatedMessages,
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
      messages: updatedMessages.map(msg => {
        if (Array.isArray((msg as AIImageMessage).content)) {
          return {
            role: 'user',
            content: (msg as AIImageMessage).content,
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: (msg as AIMessage).content,
        };
      }),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    });

    let promptTokens = null;
    let completionTokens = 0;

    if (request.show_stats && !request.stream) {
      promptTokens = {
        totalTokens: this.countMessageTokens(
          updatedMessages.map(msg => {
            return { content: JSON.stringify(msg.content) };
          })
        ),
      };
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
    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;
    if (request.input_file && isValidImageFileType(request.input_file.type)) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      updatedMessages = [
        ...updatedMessages,
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
      messages: updatedMessages.map(msg => {
        if (Array.isArray((msg as AIImageMessage).content)) {
          return {
            role: 'user',
            content: (msg as AIImageMessage).content,
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: (msg as AIMessage).content,
        };
      }),
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
    });
    let promptTokens = null;
    let completionTokens = 0;

    if (request.show_stats) {
      promptTokens = {
        totalTokens: this.countMessageTokens(
          updatedMessages.map(msg => {
            return { content: JSON.stringify(msg.content) };
          })
        ),
      };
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
