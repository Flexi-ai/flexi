import {
  AIAudioTranscriptionRequest,
  AIAudioTranscriptionResponse,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';
import { ElevenLabsClient } from 'elevenlabs';

export class ElevenLabsProvider extends AIProviderBase {
  private client: ElevenLabsClient;
  name = 'elevenlabs';

  constructor(apiKey: string) {
    super();
    this.client = new ElevenLabsClient({ apiKey });
  }

  async transcribeAudio(
    request: AIAudioTranscriptionRequest
  ): Promise<AIAudioTranscriptionResponse> {
    if (!request.input_file) {
      throw new Error('Audio file is required');
    }

    const model = request.model || 'scribe_v1';
    this.validateModel('audio', model);

    try {
      // Validate file type and size
      this.validateAudioFile(request.input_file);

      const config = {
        file: request.input_file,
        model_id: model,
      };

      const transcript = await this.client.speechToText.convert(config);

      return {
        transcription: transcript.text as string,
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
      audio: ['scribe_v1'],
    };
  }
}
