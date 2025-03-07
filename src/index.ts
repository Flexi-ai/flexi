import { Hono } from 'hono';
import { basicAuth } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { DeepseekProvider } from './providers/deepseek-provider';
import { PerplexityProvider } from './providers/perplexity-provider';
import { GroqProvider } from './providers/groq-provider';
import { QwenProvider } from './providers/qwen-provider';
import { AIProvider } from './types/ai-provider';
import { swaggerUI } from '@hono/swagger-ui';
import { createProviderRoutes } from './routes/providers';
import { createCompletionRoutes } from './routes/completion';
import { createTranscriptionRoutes } from './routes/transcription';
import swaggerSchema from './swagger.json';
import { Logger } from './utils/logger';

// Create Hono app instance
const app = new Hono({ strict: false });

// Import the HTTPResponseError type
import { HTTPResponseError } from './types/http-error';
import { ContentfulStatusCode } from 'hono/utils/http-status';

// Error handling middleware
app.onError((err, c) => {
  // Check if the error is an instance of HTTPResponseError
  const isHttpError = err instanceof HTTPResponseError;

  // Log the error with full details
  Logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    status: isHttpError ? err.status : 500,
    // Include response body if it's an API error
    response: isHttpError ? err.response?.data : err.cause,
  });

  // Cast the status code to ContentfulStatusCode type to satisfy TypeScript
  const statusCode = isHttpError
    ? ((err.status || 500) as ContentfulStatusCode)
    : (500 as ContentfulStatusCode);

  return c.json(
    {
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    },
    statusCode
  );
});

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
  { name: 'qwen', Provider: QwenProvider, envKey: 'QWEN_API_KEY' },
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

// Apply authentication and logging to all API routes
api.use('/*', basicAuth, loggingMiddleware);

// Register route handlers
api.route('/providers', createProviderRoutes(providers));
api.route('/completion', createCompletionRoutes(providers));
api.route('/transcription', createTranscriptionRoutes(providers));

// Start the server
const port = process.env.PORT || 3000;
Logger.info(`Server starting...`, {
  port,
  environment: process.env.NODE_ENV || 'development',
});

export default {
  port,
  fetch: app.fetch,
};

// Log uncaught exceptions and unhandled rejections
process.on('uncaughtException', error => {
  Logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  Logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
