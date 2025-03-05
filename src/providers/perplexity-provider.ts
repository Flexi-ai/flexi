import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from '../types/ai-provider';
import { AIProviderBase } from './base-provider';

export class PerplexityProvider extends AIProviderBase {
  private apiKey: string;
  name = 'perplexity';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async *getCompletionStream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    let messages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const requestBody = {
      model: request.model || 'sonar',
      messages,
      temperature: request?.temperature || 0.7,
      max_tokens: request?.maxTokens || 1000,
      stream: true,
    };

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      throw new Error('Perplexity does not support image inputs for now');
      // TODO: Add support for image inputs
      // const base64Content = (await this.convertFileToBase64(request.input_file)).split(',')[1];
      // const imageMessage = {
      //   role: 'user',
      //   content: [
      //     { type: 'text', text: request.messages[0]?.content || 'Please analyze this image:' },
      //     { type: 'image_url', image_url: `data:image/jpeg;base64,${base64Content}` },
      //   ],
      // };
      // messages = [imageMessage];

      // // Add subsequent messages after the image message
      // const subsequentMessages = request.messages.slice(1).map(msg => ({
      //   role: msg.role === 'assistant' ? 'assistant' : 'user',
      //   content: msg.content,
      // }));

      // if (subsequentMessages.length > 0) {
      //   messages.push(...subsequentMessages);
      // }
      // requestBody.messages = messages;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Perplexity API error: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        buffer += chunk;
        const lines = buffer.split('\n');

        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              yield {
                content,
                model: parsed.model,
                provider: this.name,
              };
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        }
      }

      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield {
                  content,
                  model: parsed.model,
                  provider: this.name,
                };
              }
            } catch (e) {
              console.error('Error parsing final SSE message:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (request.stream) {
      throw new Error('For streaming responses, please use getCompletionStream method');
    }

    let messages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const requestBody = {
      model: request.model || 'sonar',
      messages,
      temperature: request?.temperature ?? 0.7,
      max_tokens: request?.maxTokens ?? 1000,
    };

    if (request.input_file) {
      this.validateImageFile(request.input_file);
      throw new Error('Perplexity does not support image inputs for now');
      // TODO: Add support for image inputs
      // const base64Content = await this.convertFileToBase64(request.input_file);
      // const imageMessage = {
      //   role: 'user',
      //   content: [
      //     { type: 'text', text: request.messages[0]?.content || 'Please analyze this image:' },
      //     { type: 'image_url', image_url: `data:image/png;base64,${base64Content}` },
      //   ],
      // };
      // messages = [imageMessage];

      // // Add subsequent messages after the image message
      // const subsequentMessages = request.messages.slice(1).map(msg => ({
      //   role: msg.role === 'assistant' ? 'assistant' : 'user',
      //   content: msg.content,
      // }));

      // if (subsequentMessages.length > 0) {
      //   messages.push(...subsequentMessages);
      // }
      // requestBody.messages = messages;
    }
    // console.log(JSON.stringify(requestBody));
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Perplexity API error: ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`
      );
    }

    const completion = await response.json();

    return {
      content: completion.choices[0]?.message?.content || '',
      model: completion.model,
      provider: this.name,
      usage:
        request.show_stats && completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
    };
  }

  async listAvailableModels(): Promise<string[]> {
    return ['sonar-deep-research', 'sonar-reasoning-pro', 'sonar-reasoning', 'sonar-pro', 'sonar'];
  }
}
