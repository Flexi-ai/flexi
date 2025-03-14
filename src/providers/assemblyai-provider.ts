import { AssemblyAI, SpeechModel, TranscribeParams } from 'assemblyai';
import {
  AIAudioTranscriptionRequest,
  AIAudioTranscriptionResponse,
  ModelTypes,
} from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

export class AssemblyAIProvider extends AIProviderBase {
  private client: AssemblyAI;
  name = 'assemblyai';

  constructor(apiKey: string) {
    super();
    this.client = new AssemblyAI({ apiKey });
  }

  async transcribeAudio(
    request: AIAudioTranscriptionRequest
  ): Promise<AIAudioTranscriptionResponse> {
    if (!request.input_file) {
      throw new Error('Audio file is required');
    }

    const model = request.model || 'nano';
    this.validateModel('audio', model);

    try {
      // Validate file type and size
      this.validateAudioFile(request.input_file);

      const config: TranscribeParams = {
        audio: request.input_file,
        speech_model: model as SpeechModel,
        language_confidence_threshold: request.temperature || 0.7,
      };

      const transcript = await this.client.transcripts.transcribe(config);

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
      audio: ['nano', 'best'],
    };
  }
}
