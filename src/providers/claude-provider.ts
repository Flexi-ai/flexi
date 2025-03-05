import { Anthropic } from '@anthropic-ai/sdk';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

type MediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

type AIImageMessage = {
  role: 'user';
  content: {
    type: 'image';
    source: {
      type: 'base64';
      media_type: MediaType;
      data: string;
    };
  }[];
};

export class ClaudeProvider extends AIProviderBase {
  private client: Anthropic;
  name = 'claude';

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || 'claude-3-5-sonnet-20241022';
    this.validateModel('text', model);

    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;

    if (request.input_file) {
      this.validateImageFile(request.input_file);

      const base64Content = await this.convertFileToBase64(request.input_file);
      const mediaType = request.input_file.type as MediaType;
      updatedMessages = [
        ...updatedMessages,
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Content,
              },
            },
          ],
        },
      ];
    }

    const stream = await this.client.messages.create({
      model,
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
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }

    const model = request.model || 'claude-3-5-sonnet-20241022';
    this.validateModel('text', model);

    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const mediaType = request.input_file.type as MediaType;
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
                media_type: mediaType,
                data: base64Content,
              },
            },
          ],
        },
      ];
    }

    const completion = await this.client.messages.create({
      model,
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

  listAvailableModels(): ModelTypes {
    return {
      text: [
        'claude-3-7-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-5-sonnet-20240620',
        'claude-3-opus-latest',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-5-sonnet-20241022',
      ],
    };
  }
}
