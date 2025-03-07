export type ModelTypes = {
  text: string[];
  audio?: string[];
};

export interface AIMessageContent {
  type: 'text' | 'image_url' | 'image';
  content?: string;
  image_url?: {
    data: string;
  };
  source?: {
    type: string;
    media_type: string;
    data: string;
  };
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  show_stats?: boolean;
  input_file?: File;
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
  error?: string;
}

export interface AIAudioTranscriptionRequest {
  input_file: File;
  model?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | undefined;
  temperature?: number;
  prompt?: string;
}

export interface AIAudioTranscriptionResponse {
  transcription: string | { text: string };
  model: string;
  provider: string;
}

export interface AIProvider {
  name: string;
  getCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;
  getCompletionStream?(request: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
  transcribeAudio?(request: AIAudioTranscriptionRequest): Promise<AIAudioTranscriptionResponse>;
  listAvailableModels(): ModelTypes;
}
