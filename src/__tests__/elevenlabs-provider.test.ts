import { expect, test, describe, beforeEach } from 'bun:test';
import { ElevenLabsProvider } from '../providers/elevenlabs-provider';
import { AIAudioTranscriptionRequest } from '@/types/ai-provider';

const hasElevenLabsKey = !!process.env.ELEVENLABS_API_KEY;

describe('ElevenLabsProvider', () => {
  let provider: ElevenLabsProvider;

  beforeEach(() => {
    provider = new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY || 'test-api-key');
  });

  describe('transcribeAudio', () => {
    (hasElevenLabsKey ? test : test.skip)(
      'successfully transcribes audio with scribe_v1 model',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'scribe_v1',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('elevenlabs');
        expect(response.model).toBe('scribe_v1');
        expect(typeof response.transcription).toBe('string');
      },
      10000
    );

    (hasElevenLabsKey ? test : test.skip)(
      'successfully transcribes audio with scribe_v1 model',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'scribe_v1',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('elevenlabs');
        expect(response.model).toBe('scribe_v1');
        expect(typeof response.transcription).toBe('string');
      },
      10000
    );

    (hasElevenLabsKey ? test : test.skip)(
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
        expect(response.provider).toBe('elevenlabs');
        expect(response.model).toBe('scribe_v1');
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
        model: 'scribe_v1',
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
    expect(models.audio).toContain('scribe_v1');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.audio).toContain('scribe_v1');
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
