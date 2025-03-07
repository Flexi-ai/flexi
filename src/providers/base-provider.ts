import {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  ModelTypes,
} from '../types/ai-provider';

export abstract class AIProviderBase implements AIProvider {
  abstract name: string;
  abstract getCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;
  abstract listAvailableModels(): ModelTypes;

  protected validateModel(type: string, model: string) {
    const availableModels = this.listAvailableModels()[type as keyof ModelTypes];
    if (!availableModels?.includes(model)) {
      throw new Error(
        'Invalid model used. Use /provider/models api to know which models are supported'
      );
    }
  }

  protected countMessageTokens(messages: { content: string }[]): number {
    return messages.reduce((total, msg) => {
      // Count tokens for the message content (4 chars per token)
      const contentTokens = Math.ceil(msg.content.length / 4);
      return total + contentTokens;
    }, 0);
  }

  protected async convertFileToBase64(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
  }

  protected validateImageFile(file: File): void {
    const imageExtensions = ['.png', '.jpeg', '.webp'];
    const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    if (!fileExtension || !imageExtensions.includes(`.${fileExtension}`)) {
      throw new Error('Only supports image files (PNG, JPEG, and WEBP)');
    }
    if (!imageTypes.includes(file.type)) {
      throw new Error('Only supports image files (PNG, JPEG, and WEBP)');
    }
  }

  protected validateAudioFile(file: File): void {
    const validAudioFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !validAudioFormats.includes(fileExtension)) {
      throw new Error(`Invalid audio format. Supported formats: ${validAudioFormats.join(', ')}`);
    }

    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Audio file size exceeds 25MB limit');
    }
  }
}
