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
}
