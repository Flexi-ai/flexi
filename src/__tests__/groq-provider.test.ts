import { expect, test, describe, beforeEach } from 'bun:test';
import { GroqProvider } from '../providers/groq-provider';
import { AIAudioTranscriptionRequest, AICompletionRequest } from '../types/ai-provider';

const hasGroqKey = !!process.env.GROQ_API_KEY;

describe('GroqProvider', () => {
  let provider: GroqProvider;

  beforeEach(() => {
    provider = new GroqProvider(process.env.GROQ_API_KEY || 'test-api-key');
  });

  (hasGroqKey ? describe : describe.skip)('getCompletion', () => {
    test('rejects txt files in input_file', async () => {
      const testTxtPath = new URL('./data-sources/test.txt', import.meta.url);
      const bunFile = Bun.file(testTxtPath);
      const txtFile = new File([await bunFile.arrayBuffer()], 'test.txt', {
        type: 'text/plain',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Read this file' }],
        input_file: txtFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    });

    test('rejects gif files in input_file', async () => {
      const testGifPath = new URL('./data-sources/test.gif', import.meta.url);
      const bunFile = Bun.file(testGifPath);
      const gifFile = new File([await bunFile.arrayBuffer()], 'test.gif', {
        type: 'image/gif',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Analyze this image' }],
        input_file: gifFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    });

    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('llama3-8b-8192');
    });

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    }, 10000);

    test('handles input_file in request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        model: 'llama-3.2-11b-vision-preview',
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
      expect(response.content).toBeTruthy();
    }, 10000); // Increase timeout to 10 seconds for image processing

    test('handles temperature parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    });

    test('handles maxTokens parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    });

    test('shows usage stats when requested', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        show_stats: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    });
  });

  (hasGroqKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'groq');
    });

    test('handles input_file in stream request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        model: 'llama-3.2-11b-vision-preview',
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
        stream: true,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('provider', 'groq');
    }, 10000); // Increase timeout to 10 seconds for image processing
  });

  test('returns available models with correct structure', async () => {
    const models = await provider.listAvailableModels();
    expect(models).toHaveProperty('text');
    expect(Array.isArray(models.text)).toBe(true);
    expect(models.text?.length).toBeGreaterThan(0);
    expect(models.text).toContain('llama3-8b-8192');
    expect(models.text).toContain('llama-3.2-11b-vision-preview');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.text).toContain('llama3-8b-8192');
  });

  test('throws error for invalid model', async () => {
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'invalid-model',
    };

    await expect(provider.getCompletion(request)).rejects.toThrow(
      'Invalid model used. Use /provider/models api to know which models are supported'
    );
  });

  describe('transcribeAudio', () => {
    (hasGroqKey ? test : test.skip)(
      'successfully transcribes audio file',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'distil-whisper-large-v3-en',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('groq');
        expect(response.model).toBe('distil-whisper-large-v3-en');
        expect(typeof response.transcription).toBe('string');
      },
      20000
    );

    test('rejects text files', async () => {
      const testTxtPath = new URL('./data-sources/test.txt', import.meta.url);
      const bunFile = Bun.file(testTxtPath);
      const txtFile = new File([await bunFile.arrayBuffer()], 'test.txt', {
        type: 'text/plain',
      });
      const request = {
        input_file: txtFile,
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow(
        'Audio transcription failed: Invalid audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'
      );
    });

    test('throws error when input_file is missing', async () => {
      const request: AIAudioTranscriptionRequest = {
        input_file: undefined as unknown as File,
        model: 'distil-whisper-large-v3-en',
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow('Audio file is required');
    });

    test('validates model type', async () => {
      const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
      const bunFile = Bun.file(audioPath);
      const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
        type: 'audio/mpeg',
      });
      const request = {
        input_file: audioFile,
        model: 'llama3-8b-8192', // Using a text model instead of audio model
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow(
        'Invalid model used. Use /provider/models api to know which models are supported'
      );
    });
  });
});
