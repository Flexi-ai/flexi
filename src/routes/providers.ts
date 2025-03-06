import { Hono } from 'hono';
import { AIProvider } from '../types/ai-provider';

export const createProviderRoutes = (providers: Map<string, AIProvider>) => {
  const router = new Hono();

  // List available providers
  router.get('/', c => {
    return c.json({
      providers: Array.from(providers.keys()),
    });
  });

  // Get available models for a provider
  router.get('/:provider/models', async c => {
    const providerName = c.req.param('provider');
    const provider = providers.get(providerName);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    const models = await provider.listAvailableModels();
    return c.json({ models });
  });

  return router;
};
