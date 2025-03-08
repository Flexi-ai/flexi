import { expect, test, describe, beforeEach } from 'bun:test';
import { AssemblyAIProvider } from '../providers/assemblyai-provider';
import { AIAudioTranscriptionRequest } from '@/types/ai-provider';

const hasAssemblyAIKey = !!process.env.ASSEMBLYAI_API_KEY;

describe('AssemblyAIProvider', () => {
  let provider: AssemblyAIProvider;

  beforeEach(() => {
    provider = new AssemblyAIProvider(process.env.ASSEMBLYAI_API_KEY || 'test-api-key');
  });

  describe('transcribeAudio', () => {
    (hasAssemblyAIKey ? test : test.skip)(
      'successfully transcribes audio with nano model',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'nano',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('assemblyai');
        expect(response.model).toBe('nano');
        expect(typeof response.transcription).toBe('string');
      },
      10000
    );

    (hasAssemblyAIKey ? test : test.skip)(
      'successfully transcribes audio with best model',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'best',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('assemblyai');
        expect(response.model).toBe('best');
        expect(typeof response.transcription).toBe('string');
      },
      10000
    );

    (hasAssemblyAIKey ? test : test.skip)(
      'uses default model when not specified',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('assemblyai');
        expect(response.model).toBe('nano');
        expect(typeof response.transcription).toBe('string');
      },
      10000
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
        'Invalid audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'
      );
    });

    test('throws error when input_file is missing', async () => {
      const request = {
        model: 'nano',
      } as Partial<AIAudioTranscriptionRequest>;

      await expect(
        provider.transcribeAudio(request as AIAudioTranscriptionRequest)
      ).rejects.toThrow('Audio file is required');
    });
  });

  test('returns available models with correct structure', async () => {
    const models = await provider.listAvailableModels();
    expect(models).toHaveProperty('audio');
    expect(Array.isArray(models.audio)).toBe(true);
    expect(models.audio?.length).toBeGreaterThan(0);
    expect(models.audio).toContain('nano');
    expect(models.audio).toContain('best');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.audio).toContain('nano');
  });

  test('throws error for invalid model', async () => {
    const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
    const bunFile = Bun.file(audioPath);
    const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
      type: 'audio/mpeg',
    });
    const request = {
      input_file: audioFile,
      model: 'invalid-model',
    };

    await expect(provider.transcribeAudio(request)).rejects.toThrow(
      'Invalid model used. Use /provider/models api to know which models are supported'
    );
  });
});
