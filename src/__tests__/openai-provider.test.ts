import { expect, test, describe, beforeEach } from 'bun:test';
import { OpenAIProvider } from '../providers/openai-provider';
import { AIAudioTranscriptionRequest, AICompletionRequest } from '../types/ai-provider';

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider(process.env.OPENAI_API_KEY || 'test-api-key');
  });

  // Test text models with various input combinations
  const textModels = [
    'o1',
    'o1-mini',
    'o3-mini',
    'chatgpt-4o-latest',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-4o',
    'gpt-4o-mini',
  ];

  const visionModels = ['gpt-4-turbo'];
  const webSearchModels = ['gpt-4o-search-preview', 'gpt-4o-mini-search-preview'];
  const audioModels = ['whisper-1'];

  // Test cases for different input types and scenarios
  const testCases = {
    text: [
      { description: 'simple question', content: 'What is the capital of France?' },
      {
        description: 'code analysis',
        content: 'Explain this code: function add(a,b) { return a + b; }',
      },
      {
        description: 'long context',
        content: 'Write a small paragraph about artificial intelligence in 50 words',
      },
    ],
    reasoning: [
      { description: 'math problem', content: 'If x=5 and y=3, what is x^2 + y^2?' },
      {
        description: 'logic puzzle',
        content:
          'A says B is lying. B says C is lying. C says A is telling the truth. Who is lying?',
      },
    ],
    webSearch: [
      {
        description: 'current events',
        content: 'What are the latest developments in quantum computing?',
      },
      {
        description: 'technical query',
        content: 'Explain the differences between various blockchain consensus mechanisms.',
      },
    ],
  };

  (hasOpenAIKey ? describe : describe.skip)('getCompletion', () => {
    // Test text completion with various scenarios for all text models
    textModels.forEach(model => {
      // Test different text completion scenarios
      testCases.text.forEach(testCase => {
        test(`${model} handles ${testCase.description}`, async () => {
          const request: AICompletionRequest = {
            model,
            messages: [{ role: 'user', content: testCase.content }],
          };

          const response = await provider.getCompletion(request);
          expect(response.model).toContain(model);
        }, 60000);
      });

      // Test with system message
      test(`${model} handles system message`, async () => {
        const request: AICompletionRequest = {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that speaks like Shakespeare.',
            },
            { role: 'user', content: 'How are you?' },
          ],
        };

        if (['o1', 'o1-mini', 'o3-mini'].includes(model)) {
          await expect(provider.getCompletion(request)).rejects.toThrow(
            "'messages[0].role' does not support 'system' with this model"
          );
        } else {
          const response = await provider.getCompletion(request);
          expect(response.model).toContain(model);
          expect(response.content).toBeTruthy();
          expect(response.content.length).toBeGreaterThan(0);
        }
      }, 60000);

      test(`${model} handles reasoning mode`, async () => {
        const request: AICompletionRequest = {
          model,
          messages: [{ role: 'user', content: 'What is 2+2?' }],
          reasoning: true,
        };

        if (!['o1', 'o3-mini'].includes(model)) {
          await expect(provider.getCompletion(request)).rejects.toThrow(
            'Reasoning is not supported for models other than o1, o3-mini.'
          );
        } else {
          const response = await provider.getCompletion(request);
          expect(response.content).toBeTruthy();
          expect(() => JSON.parse(response.content)).not.toThrow();
        }
      }, 60000);
    });

    // Test vision capabilities
    visionModels.forEach(model => {
      test(`${model} handles image input`, async () => {
        const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
        const bunFile = Bun.file(testImagePath);
        const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
          type: 'image/png',
        });
        const request: AICompletionRequest = {
          model,
          messages: [{ role: 'user', content: 'Describe this image' }],
          input_file: imageFile,
        };

        const response = await provider.getCompletion(request);
        expect(response.content).toBeTruthy();
      }, 60000);
    });

    // Test web search capabilities
    webSearchModels.forEach(model => {
      test(`${model} handles web search`, async () => {
        const request: AICompletionRequest = {
          model,
          messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
          web_search: true,
        };

        const response = await provider.getCompletion(request);
        expect(response.content).toBeTruthy();
      }, 60000);

      test(`${model} handles web search in streaming mode`, async () => {
        const request: AICompletionRequest = {
          model,
          messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
          web_search: true,
          stream: true,
        };

        const generator = provider.getCompletionStream(request);
        const firstChunk = (await generator.next()).value;
        expect(firstChunk.content).toBeDefined();
      }, 60000);
    });

    test('rejects txt files in input_file', async () => {
      const testTxtPath = new URL('./data-sources/test.txt', import.meta.url);
      const bunFile = Bun.file(testTxtPath);
      const txtFile = new File([await bunFile.arrayBuffer()], 'test.txt', {
        type: 'text/plain',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Read this file' }],
        input_file: txtFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    }, 60000);

    test('rejects gif files in input_file', async () => {
      const testGifPath = new URL('./data-sources/test.gif', import.meta.url);
      const bunFile = Bun.file(testGifPath);
      const gifFile = new File([await bunFile.arrayBuffer()], 'test.gif', {
        type: 'image/gif',
      });
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Analyze this image' }],
        input_file: gifFile,
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Only supports image files (PNG, JPEG, and WEBP)'
      );
    }, 60000);

    test('uses default model when not specified', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('gpt-3.5-turbo-0125');
    }, 60000);

    test('maps assistant role to model role', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
    }, 30000);

    test('handles input_file in request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
      expect(response.content).toBeTruthy();
    }, 30000); // Increase timeout to 30 seconds for image processing

    test('handles temperature parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
    }, 10000);

    test('handles maxTokens parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
    }, 10000);

    test('shows usage stats when requested', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        show_stats: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    }, 10000);

    test('handles web_search parameter', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
        web_search: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('openai');
      // Note: We can't reliably test for search_results as it depends on OpenAI's response
      // and whether the model actually performs a search
    }, 10000);
  });

  (hasOpenAIKey ? describe : describe.skip)('getCompletionStream', () => {
    // Test streaming for all text models
    textModels.forEach(model => {
      test(`${model} handles streaming`, async () => {
        const request: AICompletionRequest = {
          model,
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        };

        const generator = provider.getCompletionStream(request);
        const firstChunk = (await generator.next()).value;
        expect(firstChunk.model).toContain(model);
        expect(firstChunk.content).toBeDefined();
      }, 60000);
    });

    test('handles web_search parameter in streaming mode', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
        web_search: true,
        stream: true,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('provider', 'openai');
      // Note: We can't reliably test for search_results as it depends on OpenAI's response
      // and whether the model actually performs a search in the first chunk
    }, 60000);

    test('handles input_file in stream request', async () => {
      const testImagePath = new URL('./data-sources/text-based-image.png', import.meta.url);
      const bunFile = Bun.file(testImagePath);
      const imageFile = new File([await bunFile.arrayBuffer()], 'text-based-image.png', {
        type: 'image/png',
      });
      const request: AICompletionRequest = {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Describe this image' }],
        input_file: imageFile,
        stream: true,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('provider', 'openai');
    }, 60000); // Increase timeout to 60 seconds for image processing
  });

  test('returns available models with correct structure', async () => {
    const models = await provider.listAvailableModels();
    expect(models).toHaveProperty('text');
    expect(Array.isArray(models.text)).toBe(true);
    expect(models.text?.length).toBeGreaterThan(0);
    expect(models.text).toContain('gpt-3.5-turbo');
    expect(models.text).toContain('gpt-4-turbo');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.text).toContain('gpt-3.5-turbo');
  });

  test('throws error for invalid model', async () => {
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'invalid-model',
    };

    await expect(provider.getCompletion(request)).rejects.toThrow(
      'Invalid model used. Use /provider/models api to know which models are supported'
    );
  });

  describe('transcribeAudio', () => {
    // Test audio transcription capabilities for all audio models
    audioModels.forEach(model => {
      (hasOpenAIKey ? test : test.skip)(
        `${model} handles audio transcription`,
        async () => {
          const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
          const bunFile = Bun.file(audioPath);
          const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
            type: 'audio/mpeg',
          });
          const request: AIAudioTranscriptionRequest = {
            model,
            input_file: audioFile,
          };

          const response = await provider.transcribeAudio(request);
          expect(response.transcription).toBeTruthy();
        },
        60000
      );
    });

    // Test invalid model combinations
    (hasOpenAIKey ? test : test.skip)(
      'rejects audio model for text completion',
      async () => {
        const request: AICompletionRequest = {
          model: 'whisper-1',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        await expect(provider.getCompletion(request)).rejects.toThrow(
          'Invalid model used. Use /provider/models api to know which models are supported'
        );
      },
      60000
    );

    (hasOpenAIKey ? test : test.skip)(
      'rejects text model for audio transcription',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request: AIAudioTranscriptionRequest = {
          model: 'gpt-4',
          input_file: audioFile,
        };

        await expect(provider.transcribeAudio(request)).rejects.toThrow(
          'Invalid model used. Use /provider/models api to know which models are supported'
        );
      },
      60000
    );

    (hasOpenAIKey ? test : test.skip)(
      'successfully transcribes audio file',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'whisper-1',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('openai');
        expect(response.model).toBe('whisper-1');
        expect(typeof response.transcription).toBe('string');
      },
      20000
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
        'Audio transcription failed: Invalid audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'
      );
    });

    test('throws error when input_file is missing', async () => {
      const request: AIAudioTranscriptionRequest = {
        input_file: undefined as unknown as File,
        model: 'whisper-1',
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow('Audio file is required');
    });

    test('validates model type', async () => {
      const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
      const bunFile = Bun.file(audioPath);
      const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
        type: 'audio/mpeg',
      });
      const request = {
        input_file: audioFile,
        model: 'gpt-4', // Using a text model instead of audio model
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow(
        'Invalid model used. Use /provider/models api to know which models are supported'
      );
    });
  });
});
