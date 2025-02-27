import { z } from 'zod';

export const completionSchema = z.object({
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
  show_stats: z.boolean().optional().default(false),
});
