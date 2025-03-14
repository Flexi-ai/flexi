import { z } from 'zod';

export const transcriptionSchema = z.object({
  provider: z.string(),
  input_file: z.instanceof(File),
  model: z.string().optional(),
  response_format: z.enum(['text']).optional().default('text'),
  temperature: z.number().min(0).max(1).optional().default(1),
  prompt: z.string().optional().default(''),
});
