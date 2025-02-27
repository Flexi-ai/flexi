import { Hono } from 'hono';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { AIProvider } from './types/ai-provider';
import { swaggerUI } from '@hono/swagger-ui';
import { createProviderRoutes } from './routes/providers';
import { createCompletionRoutes } from './routes/completion';
import swaggerSchema from './swagger.json';

const app = new Hono({ strict: false });

// Initialize providers map
const providers = new Map<string, AIProvider>();

// Add providers if API keys are present
if (process.env.OPENAI_API_KEY) {
  providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
}
if (process.env.ANTHROPIC_API_KEY) {
  providers.set('claude', new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
}

// Swagger API schema
app.get('/api/swagger.json', c => {
  return c.json(swaggerSchema);
});

// Swagger documentation
app.get(
  '/swagger',
  swaggerUI({
    url: '/api/swagger.json',
  })
);

// API routes
const api = app.basePath('/api');

api.route('/providers', createProviderRoutes(providers));
api.route('/completion', createCompletionRoutes(providers));

// Start the server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
