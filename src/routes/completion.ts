import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AIProvider, AICompletionRequest } from '../types/ai-provider';
import { completionSchema } from '../validators/completion';

export const createCompletionRoutes = (providers: Map<string, AIProvider>) => {
  const router = new Hono();

  // Create completion
  router.post('/', zValidator('json', completionSchema), async c => {
    const body = c.req.valid('json');
    const provider = providers.get(body.provider);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    try {
      const request: AICompletionRequest = {
        messages: body.messages,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        model: body.model,
      };

      const response = await provider.getCompletion(request);
      let responseBody = { content: response.content };
      if (body.show_stats) {
        responseBody = {
          ...responseBody,
          ...{
            model: response.model,
            provider: response.provider,
            usage: response.usage,
          },
        };
      }
      return c.json(responseBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return c.json({ error: errorMessage }, 500);
    }
  });

  return router;
};
