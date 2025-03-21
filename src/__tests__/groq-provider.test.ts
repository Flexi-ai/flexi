import { expect, test, describe, beforeEach } from 'bun:test';
import { GroqProvider } from '../providers/groq-provider';
import { AIAudioTranscriptionRequest, AICompletionRequest } from '../types/ai-provider';

const hasGroqKey = !!process.env.GROQ_API_KEY;

describe('GroqProvider', () => {
  let provider: GroqProvider;

  beforeEach(() => {
    provider = new GroqProvider(process.env.GROQ_API_KEY || 'test-api-key');
  });

  // Test text models with various input combinations
  const textModels = [
    'deepseek-r1-distill-llama-70b',
    'deepseek-r1-distill-qwen-32b',
    'gemma2-9b-it',
    'llama-3.1-8b-instant',
    'llama-3.2-1b-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-3b-preview',
    'llama-3.2-90b-vision-preview',
    'llama-3.3-70b-specdec',
    'llama-3.3-70b-versatile',
    'llama-guard-3-8b',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mistral-saba-24b',
    'mixtral-8x7b-32768',
    'qwen-2.5-32b',
    'qwen-2.5-coder-32b',
    'qwen-qwq-32b',
  ];

  const visionModels = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];

  const reasoningModels = [
    'qwen-qwq-32b',
    'deepseek-r1-distill-qwen-32b',
    'deepseek-r1-distill-llama-70b',
  ];

  const audioModels = ['distil-whisper-large-v3-en', 'whisper-large-v3-turbo', 'whisper-large-v3'];

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
      {
        description: 'logical deduction',
        content: 'If all A are B, and all B are C, what can we conclude about A and C?',
      },
      {
        description: 'problem solving',
        content: 'How would you solve the Tower of Hanoi puzzle with 3 disks?',
      },
      { description: 'mathematical reasoning', content: 'Why is the square root of 2 irrational?' },
    ],
  };

  (hasGroqKey ? describe : describe.skip)('getCompletion', () => {
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

        const response = await provider.getCompletion(request);
        expect(response.model).toContain(model);
        expect(response.content).toBeTruthy();
        expect(response.content.length).toBeGreaterThan(0);
      }, 60000);
    });

    // Test reasoning capabilities
    test('handles reasoning with supported model', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is 2+2 and why?' }],
        reasoning: true,
        model: 'deepseek-r1-distill-qwen-32b',
      };

      const response = await provider.getCompletion(request);
      expect(response.content).toBeTruthy();
      expect(response.model).toBe('deepseek-r1-distill-qwen-32b');
    });

    test('throws error for reasoning with unsupported model', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is 2+2 and why?' }],
        reasoning: true,
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Reasoning is not supported for models other than qwen-qwq-32b, deepseek-r1-distill-qwen-32b, deepseek-r1-distill-llama-70b.'
      );
    });

    // Test reasoning capabilities for each supported model
    reasoningModels.forEach(model => {
      test(`${model} handles reasoning tasks`, async () => {
        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: testCases.reasoning[0].content }],
          reasoning: true,
          model,
        };

        const response = await provider.getCompletion(request);
        expect(response.model).toBe(model);
      }, 60000);
    });
  });

  (hasGroqKey ? describe : describe.skip)('getCompletionStream', () => {
    test('yields chunks with correct structure', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('model');
      expect(firstChunk).toHaveProperty('provider', 'groq');
    });

    test('handles streaming with multiple messages', async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const chunks: string[] = [];
      for await (const chunk of provider.getCompletionStream(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });

    test('respects custom temperature and max tokens in stream', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 500,
      };

      const generator = provider.getCompletionStream(request);
      const firstChunk = (await generator.next()).value;

      expect(firstChunk).toBeDefined();
    });

    // Test text completion with various scenarios for all text models
    textModels.forEach(model => {
      // Test different text completion scenarios
      testCases.text.forEach(testCase => {
        test(`${model} handles ${testCase.description}`, async () => {
          const request: AICompletionRequest = {
            model,
            messages: [{ role: 'user', content: testCase.content }],
            stream: true,
          };

          const chunks: string[] = [];
          for await (const chunk of provider.getCompletionStream(request)) {
            chunks.push(chunk.content);
          }
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
          stream: true,
        };

        const chunks: string[] = [];
        for await (const chunk of provider.getCompletionStream(request)) {
          chunks.push(chunk.content);
        }
      }, 60000);
    });

    // Test reasoning capabilities
    test('handles reasoning with supported model', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is 2+2 and why?' }],
        reasoning: true,
        stream: true,
        model: 'deepseek-r1-distill-qwen-32b',
      };

      const chunks: string[] = [];
      for await (const chunk of provider.getCompletionStream(request)) {
        chunks.push(chunk.content);
      }
    });

    test('throws error for reasoning with unsupported model', async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'What is 2+2 and why?' }],
        reasoning: true,
        model: 'llama-3.1-8b-instant',
      };

      await expect(provider.getCompletion(request)).rejects.toThrow(
        'Reasoning is not supported for models other than qwen-qwq-32b, deepseek-r1-distill-qwen-32b, deepseek-r1-distill-llama-70b.'
      );
    });

    reasoningModels.forEach(model => {
      test(`${model} handles reasoning in stream mode`, async () => {
        const request: AICompletionRequest = {
          messages: [{ role: 'user', content: testCases.reasoning[1].content }],
          reasoning: true,
          stream: true,
          model,
        };

        const chunks: string[] = [];
        for await (const chunk of provider.getCompletionStream(request)) {
          chunks.push(chunk.content);
        }
      }, 60000);
    });
  });

  // Test web search rejection
  test('rejects web search in getCompletion', async () => {
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
      web_search: true,
    };

    await expect(provider.getCompletion(request)).rejects.toThrow(
      'Web search is not supported for this provider'
    );
  });

  test('rejects web search in getCompletionStream', async () => {
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'What is the latest news about AI?' }],
      web_search: true,
    };

    await expect(provider.getCompletionStream(request).next()).rejects.toThrow(
      'Web search is not supported for this provider'
    );
  });

  // Test vision capabilities
  (hasGroqKey ? describe : describe.skip)('getCompletionStream', () => {
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
  });

  describe('transcribeAudio', () => {
    // Test audio transcription capabilities for all audio models
    audioModels.forEach(model => {
      (hasGroqKey ? test : test.skip)(
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
    (hasGroqKey ? test : test.skip)(
      'rejects audio model for text completion',
      async () => {
        const request: AICompletionRequest = {
          model: 'distil-whisper-large-v3-en',
          messages: [{ role: 'user', content: 'Hello' }],
        };

        await expect(provider.getCompletion(request)).rejects.toThrow(
          'Invalid model used. Use /provider/models api to know which models are supported'
        );
      },
      60000
    );

    (hasGroqKey ? test : test.skip)(
      'rejects text model for audio transcription',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request: AIAudioTranscriptionRequest = {
          model: 'llama3-8b-8192',
          input_file: audioFile,
        };

        await expect(provider.transcribeAudio(request)).rejects.toThrow(
          'Invalid model used. Use /provider/models api to know which models are supported'
        );
      },
      60000
    );

    (hasGroqKey ? test : test.skip)(
      'successfully transcribes audio file',
      async () => {
        const audioPath = new URL('./data-sources/sample-audio.mp3', import.meta.url);
        const bunFile = Bun.file(audioPath);
        const audioFile = new File([await bunFile.arrayBuffer()], 'sample-audio.mp3', {
          type: 'audio/mpeg',
        });
        const request = {
          input_file: audioFile,
          model: 'distil-whisper-large-v3-en',
          response_format: 'text' as const,
          temperature: 0.7,
        };

        const response = await provider.transcribeAudio(request);
        expect(response.provider).toBe('groq');
        expect(response.model).toBe('distil-whisper-large-v3-en');
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
        model: 'distil-whisper-large-v3-en',
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
        model: 'llama3-8b-8192', // Using a text model instead of audio model
      };

      await expect(provider.transcribeAudio(request)).rejects.toThrow(
        'Invalid model used. Use /provider/models api to know which models are supported'
      );
    });
  });

  (hasGroqKey ? test : test.skip)(
    'uses default model when not specified',
    async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await provider.getCompletion(request);
      expect(response.model).toBe('llama3-8b-8192');
    },
    60000
  );

  (hasGroqKey ? test : test.skip)(
    'maps assistant role to model role',
    async () => {
      const request: AICompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ],
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    },
    30000
  );

  (hasGroqKey ? test : test.skip)(
    'handles temperature parameter',
    async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    },
    10000
  );

  (hasGroqKey ? test : test.skip)(
    'handles maxTokens parameter',
    async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 500,
      };

      const response = await provider.getCompletion(request);
      expect(response.provider).toBe('groq');
    },
    10000
  );

  (hasGroqKey ? test : test.skip)(
    'shows usage stats when requested',
    async () => {
      const request: AICompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        show_stats: true,
      };

      const response = await provider.getCompletion(request);
      expect(response.usage).toBeDefined();
      expect(response.usage).toHaveProperty('promptTokens');
      expect(response.usage).toHaveProperty('completionTokens');
      expect(response.usage).toHaveProperty('totalTokens');
    },
    10000
  );

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

  test('throws error for invalid API key', async () => {
    const invalidProvider = new GroqProvider('invalid-key');
    const request: AICompletionRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
    };

    await expect(invalidProvider.getCompletion(request)).rejects.toThrow();
  });

  test('returns available models with correct structure', async () => {
    const models = await provider.listAvailableModels();
    expect(models).toHaveProperty('text');
    expect(Array.isArray(models.text)).toBe(true);
    expect(models.text?.length).toBeGreaterThan(0);
    expect(models.text).toContain('mixtral-8x7b-32768');
    expect(models.text).toContain('llama-3.1-8b-instant');
  });

  test('validates correct model type', async () => {
    const models = await provider.listAvailableModels();
    expect(models.text).toContain('mixtral-8x7b-32768');
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
});
