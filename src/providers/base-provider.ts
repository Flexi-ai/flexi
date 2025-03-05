import { AICompletionRequest, AICompletionResponse, AIProvider } from '../types/ai-provider';

export abstract class AIProviderBase implements AIProvider {
  abstract name: string;
  abstract getCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;
  abstract listAvailableModels(): Promise<string[]>;

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
      throw new Error('Only supports image files (PNG, JPG, JPEG, and WEBP)');
    }
    if (!imageTypes.includes(file.type)) {
      throw new Error('Only supports image files (PNG, JPG, JPEG, and WEBP)');
    }
  }
}
