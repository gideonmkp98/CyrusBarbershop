import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  MASTER_EMAIL: z.string().email(),
  MASTER_PASSWORD: z.string().min(8),
  PUBLIC_SITE_URL: z.string().url()
});

export function validateEnv(env: Record<string, string | undefined>) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Missing or invalid environment variables: ${errors}`);
  }
  return result.data;
}