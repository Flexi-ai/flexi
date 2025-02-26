import { Hono } from 'hono';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { AIProvider, AICompletionRequest } from './types/ai-provider';
import { swaggerUI } from '@hono/swagger-ui';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// Initialize providers map
const providers = new Map<string, AIProvider>();

// Add providers if API keys are present
if (process.env.OPENAI_API_KEY) {
  providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
}
if (process.env.ANTHROPIC_API_KEY) {
  providers.set('claude', new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
}

// Swagger documentation
app.get(
  '/swagger',
  swaggerUI({
    url: '/api/swagger.json',
  })
);

// API routes
const api = app.route('/api');

// List available providers
api.get('/providers', c => {
  return c.json({
    providers: Array.from(providers.keys()),
  });
});

// Get available models for a provider
api.get('/providers/:provider/models', async c => {
  const providerName = c.req.param('provider');
  const provider = providers.get(providerName);

  if (!provider) {
    return c.json({ error: 'Provider not found' }, 404);
  }

  const models = await provider.listAvailableModels();
  return c.json({ models });
});

// Completion endpoint schema
const completionSchema = z.object({
  provider: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  model: z.string().optional(),
});

// Create completion
api.post('/completion', zValidator('json', completionSchema), async c => {
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
    return c.json(response);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Start the server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
