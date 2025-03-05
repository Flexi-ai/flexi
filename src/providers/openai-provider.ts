import { OpenAI } from 'openai';
import { AICompletionRequest, AICompletionResponse, AIMessage, AIStreamChunk } from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

type AIImageMessage = {
  role: 'user';
  content: {
    type: 'image_url';
    image_url: {
      url: string;
    };

  }[]
};

export class OpenAIProvider extends AIProviderBase {
  private client: OpenAI;
  name = 'openai';

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    let updatedMessages :(AIMessage | AIImageMessage)[]  = request.messages;
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
      model: request.model || 'gpt-3.5-turbo',
      messages: updatedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role,
        content: JSON.stringify(msg.content),
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
      model: request.model || 'gpt-3.5-turbo',
      messages: updatedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role,
        content: JSON.stringify(msg.content),
      })),
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
