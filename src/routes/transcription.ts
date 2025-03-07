import { Hono } from 'hono';
import { AIProvider, AIAudioTranscriptionRequest } from '../types/ai-provider';
import { transcriptionSchema } from '../validators/transcription';

export const createTranscriptionRoutes = (providers: Map<string, AIProvider>) => {
  const router = new Hono();

  // Create transcription
  router.post('/', async c => {
    let body;
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const requestJson = formData.get('request');
      const audioFile = formData.get('input_file');

      if (!requestJson || !audioFile) {
        return c.json({ error: 'Missing request parameters or audio file' }, 500);
      }

      try {
        body = JSON.parse(requestJson.toString());
        if (audioFile instanceof File) {
          body.input_file = audioFile;
        }
      } catch {
        return c.json({ error: 'Invalid JSON in request parameter' }, 500);
      }
    } else {
      return c.json({ error: 'Audio transcription requires multipart/form-data' }, 500);
    }

    const validationResult = transcriptionSchema.safeParse(body);
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

    if (!provider.transcribeAudio) {
      return c.json({ error: 'Audio transcription is not supported by this provider' }, 400);
    }

    try {
      const request: AIAudioTranscriptionRequest = {
        input_file: body.input_file,
        model: body.model,
        response_format: body.response_format,
        temperature: body.temperature,
        prompt: body.prompt,
      };

      const response = await provider.transcribeAudio(request);
      return c.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return c.json({ error: errorMessage }, 500);
    }
  });

  return router;
};
