import { Hono } from 'hono';
import { AIProvider, AICompletionRequest } from '../types/ai-provider';
import { completionSchema } from '../validators/completion';

export const createCompletionRoutes = (providers: Map<string, AIProvider>) => {
  const router = new Hono();

  // Create completion
  router.post('/', async c => {
    let body;
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const requestJson = formData.get('request');
      const inputFile = formData.get('input_file');

      if (!requestJson) {
        return c.json({ error: 'Missing request parameters' }, 500);
      }

      try {
        body = JSON.parse(requestJson.toString());
        if (inputFile && inputFile instanceof File) {
          body.input_file = inputFile;
        }
      } catch {
        return c.json({ error: 'Invalid JSON in request parameter' }, 500);
      }
    } else {
      body = await c.req.json();
    }

    const validationResult = completionSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json(
        { error: 'Invalid request parameters', details: validationResult.error.errors },
        500
      );
    }
    body = validationResult.data;
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
        stream: body.stream,
        show_stats: body.show_stats,
        input_file: body.input_file,
        web_search: body.web_search,
      };

      if (body.stream && provider.getCompletionStream) {
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        const stream = provider.getCompletionStream(request);
        return new Response(
          new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of stream) {
                  if (chunk.error) {
                    const errorData = JSON.stringify({
                      error: chunk.error,
                      status: 500,
                    });
                    controller.enqueue(new TextEncoder().encode(`${errorData}\n\n`));
                    controller.close();
                    return;
                  }
                  const data = JSON.stringify({
                    content: chunk.content,
                    ...(body.show_stats
                      ? {
                          model: chunk.model,
                          provider: chunk.provider,
                          usage: chunk.usage,
                        }
                      : {}),
                    ...(chunk.search_results ? { search_results: chunk.search_results } : {}),
                  });
                  controller.enqueue(new TextEncoder().encode(`${data}\n\n`));
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : 'An unknown error occurred';
                const errorData = JSON.stringify({
                  error: errorMessage,
                  status: 500,
                });
                controller.enqueue(new TextEncoder().encode(`${errorData}\n\n`));
              } finally {
                controller.close();
              }
            },
          })
        );
      }

      if (!provider.getCompletion) {
        return c.json({ error: 'Completion is not supported by this provider' }, 400);
      }

      const response = await provider.getCompletion(request);
      let responseBody: Partial<typeof response> = { content: response.content };
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
      if (response.search_results) {
        responseBody = {
          ...responseBody,
          search_results: response.search_results,
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
