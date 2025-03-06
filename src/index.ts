import { Hono } from 'hono';
import { basicAuth } from './middleware/auth';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { DeepseekProvider } from './providers/deepseek-provider';
import { PerplexityProvider } from './providers/perplexity-provider';
import { GroqProvider } from './providers/groq-provider';
import { AIProvider } from './types/ai-provider';
import { swaggerUI } from '@hono/swagger-ui';
import { createProviderRoutes } from './routes/providers';
import { createCompletionRoutes } from './routes/completion';
import swaggerSchema from './swagger.json';

const app = new Hono({ strict: false });

// Initialize providers map
const providers = new Map<string, AIProvider>();

// Provider configuration
const providerConfig = [
  { name: 'openai', Provider: OpenAIProvider, envKey: 'OPENAI_API_KEY' },
  { name: 'claude', Provider: ClaudeProvider, envKey: 'ANTHROPIC_API_KEY' },
  { name: 'gemini', Provider: GeminiProvider, envKey: 'GEMINI_API_KEY' },
  { name: 'deepseek', Provider: DeepseekProvider, envKey: 'DEEPSEEK_API_KEY' },
  { name: 'perplexity', Provider: PerplexityProvider, envKey: 'PERPLEXITY_API_KEY' },
  { name: 'groq', Provider: GroqProvider, envKey: 'GROQ_API_KEY' },
];

// Register providers with available API keys
providerConfig.forEach(({ name, Provider, envKey }) => {
  const apiKey = process.env[envKey];
  if (apiKey) {
    providers.set(name, new Provider(apiKey));
  }
});

// Swagger API schema
app.get('/api/swagger.json', basicAuth, c => {
  return c.json(swaggerSchema);
});

// Swagger documentation
app.get(
  '/swagger',
  basicAuth,
  swaggerUI({
    url: '/api/swagger.json',
  })
);

// API routes
const api = app.basePath('/api');

// Apply authentication to all API routes
api.use('/*', basicAuth);

api.route('/providers', createProviderRoutes(providers));
api.route('/completion', createCompletionRoutes(providers));

// Start the server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
