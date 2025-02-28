export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'bot';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIStreamChunk {
  content: string;
  model?: string;
  provider?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  name: string;
  getCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;
  getCompletionStream?(request: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
  listAvailableModels(): Promise<string[]>;
}
