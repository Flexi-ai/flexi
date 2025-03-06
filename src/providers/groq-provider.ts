import Groq from 'groq-sdk';

import {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

type AIImageMessage = {
  role: 'user';
  content: {
    type: 'image_url';
    image_url: {
      url: string;
    };
  }[];
};

export class GroqProvider extends AIProviderBase {
  private client: Groq;
  name = 'groq';

  constructor(apiKey: string) {
    super();
    this.client = new Groq({ apiKey });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || 'llama3-8b-8192';
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
              image_url: { url: `data:image/png;base64,${base64Content}` }, // Embed image
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
          role: msg.role === 'assistant' ? 'assistant' : 'user',
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

    const model = request.model || 'llama3-8b-8192';
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
              image_url: { url: `data:image/png;base64,${base64Content}` }, // Embed image
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
        request.show_stats && !request.stream && completion.usage
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
        'llama-3.3-70b-versatile',
        'gemma2-9b-it',
        'llama-3.2-1b-preview',
        'mistral-saba-24b',
        'qwen-2.5-32b',
        'deepseek-r1-distill-qwen-32b',
        'llama-guard-3-8b',
        'llama-3.2-90b-vision-preview',
        'mixtral-8x7b-32768',
        'llama-3.1-8b-instant',
        'deepseek-r1-distill-llama-70b',
        'llama3-70b-8192',
        'llama-3.2-3b-preview',
        'llama3-8b-8192',
        'qwen-2.5-coder-32b',
        'llama-3.2-11b-vision-preview',
        'llama-3.3-70b-specdec',
        'qwen-qwq-32b',
      ],
    };
  }
}
