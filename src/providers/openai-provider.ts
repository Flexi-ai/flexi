import { OpenAI } from 'openai';
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
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

// Define types for OpenAI annotations and URL citations
interface OpenAIAnnotation {
  type: string;
  url_citation?: {
    title?: string;
    url?: string;
  };
}

// Extend OpenAI types to include annotations
interface ExtendedDelta extends OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta {
  annotations?: OpenAIAnnotation[];
}

interface ExtendedChatCompletionMessage extends OpenAI.Chat.Completions.ChatCompletionMessage {
  annotations?: OpenAIAnnotation[];
}

// Define types for stream and completion options
type OpenAIStreamOptions = ChatCompletionCreateParams & {
  web_search_options?: Record<string, unknown>;
};

type OpenAICompletionOptions = ChatCompletionCreateParams & {
  web_search_options?: Record<string, unknown>;
};

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
    const model = request.model || (request.web_search ? 'gpt-4o-search-preview' : 'gpt-3.5-turbo');
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

    const streamOptions: OpenAIStreamOptions = {
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
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    };

    if (request.web_search) {
      streamOptions.web_search_options = {};
    }
    // Only add temperature if web_search is not enabled
    if (!request.web_search) {
      streamOptions.temperature = request?.temperature || 0.7;
    }

    const stream = await this.client.chat.completions.create(streamOptions);

    let searchResults: AIStreamChunk['search_results'] = undefined;

    // Track if we've processed annotations already
    let processedAnnotations = false;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';

      // Check for annotations in the response (new format for web search)
      if (!processedAnnotations && (chunk.choices[0]?.delta as ExtendedDelta)?.annotations) {
        const annotations = (chunk.choices[0].delta as ExtendedDelta).annotations || [];
        searchResults = annotations
          .filter(
            (annotation: OpenAIAnnotation) =>
              annotation.type === 'url_citation' && annotation.url_citation
          )
          .map((annotation: OpenAIAnnotation) => ({
            title: annotation?.url_citation?.title || '',
            url: annotation?.url_citation?.url || '',
          }));
        processedAnnotations = true;
      }

      if (content || searchResults) {
        yield {
          content,
          model: chunk.model,
          provider: this.name,
          search_results: searchResults,
        };
      }
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }

    const model = request.model || (request.web_search ? 'gpt-4o-search-preview' : 'gpt-3.5-turbo');
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

    const completionOptions: OpenAICompletionOptions = {
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
      max_tokens: request?.maxTokens || 1000,
    };

    if (request.web_search) {
      completionOptions.web_search_options = {};
    }
    // Only add temperature if web_search is not enabled
    if (!request.web_search) {
      completionOptions.temperature = request?.temperature || 0.7;
    }

    const completion = await this.client.chat.completions.create(completionOptions);

    // Extract search results if available
    let searchResults;
    let completionContent = completion.choices[0]?.message?.content || '';
    // Check for annotations in the response (new format for web search)
    if (
      request.web_search &&
      (completion.choices[0]?.message as ExtendedChatCompletionMessage)?.annotations
    ) {
      const annotations =
        (completion.choices[0].message as ExtendedChatCompletionMessage).annotations || [];
      searchResults = annotations
        .filter(
          (annotation: OpenAIAnnotation) =>
            annotation.type === 'url_citation' && annotation.url_citation
        )
        .map((annotation: OpenAIAnnotation) => ({
          title: annotation?.url_citation?.title || '',
          url: annotation?.url_citation?.url || '',
        }));

      completionContent = completionContent
        .replace(/\(\[[^\]]+\]\([^)]+\)\)/g, '')
        // Remove standalone markdown links at the end
        .replace(/\n\n## [^\n]+\n(- \[[^\]]+\]\([^)]+\)\n)+$/g, '')
        // Clean up any double spaces or extra newlines that might be left
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return {
      content: completionContent,
      model: completion.model,
      provider: this.name,
      search_results: searchResults,
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
        'gpt-4o-search-preview',
        'gpt-4o-mini-search-preview',
      ],
      audio: ['whisper-1'],
    };
  }
}
