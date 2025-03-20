import Groq from 'groq-sdk';
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
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'groq-sdk/resources/chat/completions';

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
    const model =
      request.model || (request.reasoning ? 'deepseek-r1-distill-qwen-32b' : 'llama3-8b-8192');
    this.validateModel('text', model);

    if (request.web_search) {
      throw new Error('Web search is not supported for this provider');
    }

    // Check if reasoning is supported for the selected model
    if (
      !['qwen-qwq-32b', 'deepseek-r1-distill-qwen-32b', 'deepseek-r1-distill-llama-70b'].includes(
        model
      ) &&
      request.reasoning
    ) {
      throw new Error(
        'Reasoning is not supported for models other than qwen-qwq-32b, deepseek-r1-distill-qwen-32b, deepseek-r1-distill-llama-70b.'
      );
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

    const streamOptions: ChatCompletionCreateParamsStreaming = {
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
      max_completion_tokens: request?.maxTokens || 1000,
      stream: true,
    };

    // Add reasoning_format if reasoning is enabled
    if (request.reasoning) {
      streamOptions.reasoning_format = 'parsed';
    }

    const stream = await this.client.chat.completions.create(streamOptions);

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

    if (request.web_search) {
      throw new Error('Web search is not supported for this provider');
    }

    const model =
      request.model || (request.reasoning ? 'deepseek-r1-distill-qwen-32b' : 'llama3-8b-8192');
    this.validateModel('text', model);

    // Check if reasoning is supported for the selected model
    if (
      !['qwen-qwq-32b', 'deepseek-r1-distill-qwen-32b', 'deepseek-r1-distill-llama-70b'].includes(
        model
      ) &&
      request.reasoning
    ) {
      throw new Error(
        'Reasoning is not supported for models other than qwen-qwq-32b, deepseek-r1-distill-qwen-32b, deepseek-r1-distill-llama-70b.'
      );
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

    const completionOptions: ChatCompletionCreateParamsNonStreaming = {
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
      max_completion_tokens: request?.maxTokens || 1000,
    };

    // Add reasoning_format if reasoning is enabled
    if (request.reasoning) {
      completionOptions.reasoning_format = 'parsed';
    }

    const completion = await this.client.chat.completions.create(completionOptions);

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

    const model = request.model || 'distil-whisper-large-v3-en';
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
        'deepseek-r1-distill-llama-70b',
        'deepseek-r1-distill-qwen-32b',
        'gemma2-9b-it',
        'llama-3.1-8b-instant',
        'llama-3.2-1b-preview',
        'llama-3.2-11b-vision-preview',
        'llama-3.2-3b-preview',
        'llama-3.2-90b-vision-preview',
        'llama-3.3-70b-specdec',
        'llama-3.3-70b-versatile',
        'llama-guard-3-8b',
        'llama3-70b-8192',
        'llama3-8b-8192',
        'mistral-saba-24b',
        'mixtral-8x7b-32768',
        'qwen-2.5-32b',
        'qwen-2.5-coder-32b',
        'qwen-qwq-32b',
      ],
      audio: ['distil-whisper-large-v3-en', 'whisper-large-v3-turbo', 'whisper-large-v3'],
    };
  }
}
