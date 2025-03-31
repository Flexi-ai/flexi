import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIAudioTranscriptionRequest,
  AIAudioTranscriptionResponse,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

type AIContentMessage = {
  role: 'model' | 'user';
  parts: [{ text: string }];
};

type AIImageMessage = {
  role: 'user';
  parts: {
    inlineData: {
      mimeType: string;
      data: string;
    };
  }[];
};
export class GeminiProvider extends AIProviderBase {
  private client: GoogleGenerativeAI;
  name = 'gemini';

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    if (request.reasoning) {
      throw new Error('Reasoning is not supported for streaming responses');
    }
    const model = request.model || 'gemini-2.0-flash';
    this.validateModel('text', model);

    let updatedContents: (AIContentMessage | AIImageMessage)[] = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      const imageData: AIImageMessage = {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: request.input_file.type,
              data: base64Content,
            },
          },
        ],
      };
      updatedContents.push(imageData);
    }

    const providerModel = this.client.getGenerativeModel({ model });
    const result = await providerModel.generateContentStream({
      contents: updatedContents,
      generationConfig: {
        temperature: request?.temperature || 0.7,
        maxOutputTokens: request?.maxTokens || 1000,
      },
    });

    for await (const chunk of result.stream) {
      yield {
        content: chunk.text(),
        model: request.model || 'gemini-2.0-flash',
        provider: this.name,
      };
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }

    const model = request.model || 'gemini-2.0-flash';
    this.validateModel('text', model);

    if (
      request.reasoning &&
      !['gemini-2.0-flash-thinking-exp', 'gemini-2.5-pro-exp-03-25'].includes(model)
    ) {
      throw new Error('Reasoning is not supported for this model');
    }

    let updatedContents: (AIContentMessage | AIImageMessage)[] = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      const base64Content = await this.convertFileToBase64(request.input_file);
      const imageData: AIImageMessage = {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: request.input_file.type,
              data: base64Content,
            },
          },
        ],
      };
      updatedContents.push(imageData);
    }

    const providerModel = this.client.getGenerativeModel({ model });
    const result = await providerModel.generateContent({
      contents: updatedContents,
      generationConfig: {
        temperature: request?.temperature || 0.7,
        maxOutputTokens: request?.maxTokens || 1000,
      },
    });
    const response = await result.response;
    const responseText = response.text();

    let usage = undefined;

    if (request.show_stats) {
      const promptTokens = this.countMessageTokens(request.messages);
      const completionTokens = this.countMessageTokens([{ content: responseText }]);
      usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    }

    return {
      content: responseText,
      model: request.model || 'gemini-2.0-flash',
      provider: this.name,
      usage,
    };
  }

  async transcribeAudio(
    request: AIAudioTranscriptionRequest
  ): Promise<AIAudioTranscriptionResponse> {
    if (!request.input_file) {
      throw new Error('Audio file is required');
    }

    const model = request.model || 'gemini-2.0-flash';
    this.validateModel('audio', model);

    try {
      // Validate file type and size
      this.validateAudioFile(request.input_file);

      // Convert the file to a base64 string
      const base64String = await this.convertFileToBase64(request.input_file);

      const audioPart = {
        inlineData: {
          mimeType: request.input_file.type,
          data: base64String,
        },
      };

      const prompt = 'Transcribe the following audio:';

      const providerModel = this.client.getGenerativeModel({ model });

      const result = await providerModel.generateContent([prompt, audioPart]);
      const response = await result.response;
      const transcription = response.text();

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
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-thinking-exp',
        'gemini-2.5-pro-exp-03-25',
      ],
      audio: [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-pro-exp-03-25',
      ],
    };
  }
}
