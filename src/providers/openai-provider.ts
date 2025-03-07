import { OpenAI } from 'openai';
import {
  AIAudioTranscriptionRequest,
  AIAudioTranscriptionResponse,
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

export class OpenAIProvider extends AIProviderBase {
  private client: OpenAI;
  name = 'openai';

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || 'gpt-3.5-turbo';
    this.validateModel('text', model);

    let updatedMessages: (AIMessage)[] = request.messages;

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

    const model = request.model || 'gpt-3.5-turbo';
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
  async transcribeAudio(
    request: AIAudioTranscriptionRequest
  ): Promise<AIAudioTranscriptionResponse> {
    if (!request.input_file) {
      throw new Error('Audio file is required');
    }

    const model = request.model || 'whisper-1';
    this.validateModel('audio', model);

    try {
      // Validate file type and size
      this.validateAudioFile(request.input_file);

      const transcription = await this.client.audio.transcriptions.create({
        file: request.input_file,
        model,
        response_format: request.response_format || 'text',
        temperature: request.temperature,
        prompt: request.prompt,
      });

      return {
        transcription: transcription,
        model: model,
        provider: this.name,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Audio transcription failed: ${error.message}`);
      }
      throw new Error('Audio transcription failed: Unknown error');
    }
  }

  listAvailableModels(): ModelTypes {
    return {
      text: [
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
      ],
      audio: ['whisper-1'],
    };
  }
}
