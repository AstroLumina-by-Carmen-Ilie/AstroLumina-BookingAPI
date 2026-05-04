import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3033),

  CALCOM_API_KEY: z.string().min(1, 'CALCOM_API_KEY is required'),
  CALCOM_BASE_URL: z.string().url().default('https://api.cal.com'),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_RELEASE: z.string().optional(),

  CORS_ORIGINS: z.string().optional(),

  RESEND_API_KEY: z.string().startsWith('re_', 'Must be a valid Resend API key').optional(),

  R2_BASE_URL: z.string().url().min(1, 'R2_BASE_URL is required'),

  D1_ACCOUNT_ID: z.string().min(1, 'D1_ACCOUNT_ID is required'),
  D1_DATABASE_ID: z.string().min(1, 'D1_DATABASE_ID is required'),
  D1_API_TOKEN: z.string().min(1, 'D1_API_TOKEN is required'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
