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

export class GrokProvider extends AIProviderBase {
  private client: OpenAI;
  name = 'grok';

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: apiKey,
    });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    if (request.reasoning) {
      throw new Error('Reasoning is not supported for this provider');
    }

    const model = request.model || 'grok-2';
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
          role: msg.role,
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

    if (request.reasoning) {
      throw new Error('Reasoning is not supported for this provider');
    }

    const model = request.model || 'grok-2';
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
      text: ['grok-2', 'grok-2-latest', 'grok-2-vision', 'grok-2-vision-latest'],
    };
  }
}
