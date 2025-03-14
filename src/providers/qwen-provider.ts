import {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';
import OpenAI from 'openai';

type AIImageMessage = {
  role: 'user';
  content: {
    type: 'image_url';
    image_url: {
      url: string;
    };
  }[];
};

export class QwenProvider extends AIProviderBase {
  private client: OpenAI;
  name = 'qwen';

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      apiKey: apiKey,
    });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || 'qwen-plus';
    this.validateModel('text', model);

    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      updatedMessages = [
        ...updatedMessages,
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
      model,
      messages: updatedMessages.map(msg => {
        if (Array.isArray((msg as AIImageMessage).content)) {
          return {
            role: 'user',
            content: (msg as AIImageMessage).content,
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : msg.role,
          content: (msg as AIMessage).content,
        };
      }),
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

    const model = request.model || 'qwen-plus';
    this.validateModel('text', model);

    let updatedMessages: (AIMessage | AIImageMessage)[] = request.messages;
    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      updatedMessages = [
        ...updatedMessages,
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
      model,
      messages: updatedMessages.map(msg => {
        if (Array.isArray((msg as AIImageMessage).content)) {
          return {
            role: 'user',
            content: (msg as AIImageMessage).content,
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : msg.role,
          content: (msg as AIMessage).content,
        };
      }),
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

  listAvailableModels(): ModelTypes {
    return {
      text: [
        'qwen-max',
        'qwen-max',
        'qwen-max-latest',
        'qwen-plus',
        'qwen-plus-0125',
        'qwen-plus-latest',
        'qwen-turbo',
        'qwen-turbo-1101',
        'qwen-turbo-latest',
      ],
    };
  }
}
