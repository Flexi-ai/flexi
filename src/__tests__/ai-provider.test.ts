import { expect, test, describe } from 'bun:test';
import {
  AIMessage,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  ModelTypes,
  AIMessageContent,
  AIAudioTranscriptionRequest,
  AIAudioTranscriptionResponse,
  AIProvider,
} from '../types/ai-provider';

describe('AI Provider Types', () => {
  test('ModelTypes structure', () => {
    const modelTypes: ModelTypes = {
      text: ['gpt-4', 'gpt-3.5'],
      audio: ['whisper-1'],
    };

    expect(modelTypes.text).toBeArray();
    expect(modelTypes.audio).toBeArray();
    expect(modelTypes.text).toContain('gpt-4');
    expect(modelTypes.audio).toContain('whisper-1');
  });

  test('AIMessageContent structure', () => {
    const textContent: AIMessageContent = {
      type: 'text',
      content: 'Hello world',
    };

    expect(textContent.type).toBe('text');
    expect(textContent.content).toBe('Hello world');

    const imageUrlContent: AIMessageContent = {
      type: 'image_url',
      image_url: {
        data: 'base64-encoded-image',
      },
    };

    expect(imageUrlContent.type).toBe('image_url');
    expect(imageUrlContent.image_url?.data).toBe('base64-encoded-image');

    const imageContent: AIMessageContent = {
      type: 'image',
      source: {
        type: 'image/jpeg',
        media_type: 'image/jpeg',
        data: 'base64-encoded-image',
      },
    };

    expect(imageContent.type).toBe('image');
    expect(imageContent.source?.type).toBe('image/jpeg');
    expect(imageContent.source?.data).toBe('base64-encoded-image');
  });

  test('AIStreamChunk structure', () => {
    const chunk: AIStreamChunk = {
      content: 'Test chunk',
      model: 'test-model',
      provider: 'test-provider',
    };

    expect(chunk.content).toBe('Test chunk');
    expect(chunk.model).toBe('test-model');
    expect(chunk.provider).toBe('test-provider');
  });

  test('AIMessage structure', () => {
    const message: AIMessage = {
      role: 'user',
      content: 'Hello, AI!',
    };

    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello, AI!');
  });

  test('AICompletionRequest structure', () => {
    const request: AICompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Test message',
        },
      ],
      temperature: 0.7,
      maxTokens: 100,
      model: 'test-model',
    };

    expect(request.messages).toHaveLength(1);
    expect(request.temperature).toBe(0.7);
    expect(request.maxTokens).toBe(100);
    expect(request.model).toBe('test-model');
  });

  test('AICompletionResponse structure', () => {
    const response: AICompletionResponse = {
      content: 'Test response',
      model: 'test-model',
      provider: 'test-provider',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };

    expect(response.content).toBe('Test response');
    expect(response.model).toBe('test-model');
    expect(response.provider).toBe('test-provider');
    expect(response.usage?.totalTokens).toBe(30);
  });

  test('AIAudioTranscriptionRequest structure', () => {
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
    const request: AIAudioTranscriptionRequest = {
      input_file: file,
      model: 'whisper-1',
      response_format: 'text',
      temperature: 0.5,
      prompt: 'Transcribe this audio',
    };

    expect(request.input_file).toBeInstanceOf(File);
    expect(request.model).toBe('whisper-1');
    expect(request.response_format).toBe('text');
    expect(request.temperature).toBe(0.5);
    expect(request.prompt).toBe('Transcribe this audio');
  });

  test('AIAudioTranscriptionResponse structure', () => {
    const textResponse: AIAudioTranscriptionResponse = {
      transcription: 'Hello, this is a test transcription',
      model: 'whisper-1',
      provider: 'openai',
    };

    expect(textResponse.transcription).toBe('Hello, this is a test transcription');
    expect(textResponse.model).toBe('whisper-1');
    expect(textResponse.provider).toBe('openai');

    const objectResponse: AIAudioTranscriptionResponse = {
      transcription: { text: 'Hello, this is a test transcription' },
      model: 'whisper-1',
      provider: 'openai',
    };

    expect(typeof objectResponse.transcription).toBe('object');
    expect((objectResponse.transcription as { text: string }).text).toBe(
      'Hello, this is a test transcription'
    );
  });

  test('AIProvider interface implementation', () => {
    const provider: AIProvider = {
      name: 'test-provider',
      getCompletion: async () => {
        return {
          content: 'Test response',
          model: 'test-model',
          provider: 'test-provider',
        };
      },
      getCompletionStream: async function* () {
        yield {
          content: 'Test chunk',
          model: 'test-model',
          provider: 'test-provider',
        };
      },
      transcribeAudio: async () => {
        return {
          transcription: 'Test transcription',
          model: 'test-model',
          provider: 'test-provider',
        };
      },
      listAvailableModels: () => ({
        text: ['model1', 'model2'],
        audio: ['whisper-1'],
      }),
    };

    expect(provider.name).toBe('test-provider');
    expect(typeof provider.getCompletion).toBe('function');
    expect(typeof provider.getCompletionStream).toBe('function');
    expect(typeof provider.transcribeAudio).toBe('function');
    expect(typeof provider.listAvailableModels).toBe('function');

    const models = provider.listAvailableModels();
    expect(models.text).toBeArray();
    expect(models.audio).toBeArray();
  });
});
