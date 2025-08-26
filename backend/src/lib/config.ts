import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_TEST: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  ACCESS_TOKEN_TTL_MINUTES: z.string().transform(v => parseInt(v)).default('10'),
  REFRESH_TOKEN_TTL_DAYS: z.string().transform(v => parseInt(v)).default('7'),
  CORS_ORIGIN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional()
});

// Trim string env values to avoid failures from accidental trailing spaces like "test "
const rawEnv: Record<string, string | undefined> = {};
for (const k of Object.keys(process.env)) {
  const v = process.env[k];
  rawEnv[k] = typeof v === 'string' ? v.trim() : v;
}

// Parse but don't throw hard in test environment — tests may set minimal envs.
const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.error('Environment validation failed:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>);

// In production we require several strong secrets and a DB URL. Fail fast with clear errors.
const isProduction = (rawEnv.NODE_ENV || process.env.NODE_ENV) === 'production' || env.NODE_ENV === 'production';
if (isProduction) {
  const prodMissing: string[] = [];
  if (!env.DATABASE_URL || env.DATABASE_URL.trim() === '') prodMissing.push('DATABASE_URL');
  if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < 32) prodMissing.push('JWT_ACCESS_SECRET (>=32 chars)');
  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32) prodMissing.push('JWT_REFRESH_SECRET (>=32 chars)');

  if (prodMissing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Missing or weak production environment variables:', prodMissing.join(', '));
    throw new Error('Invalid environment configuration for production; see log for missing variables');
  }
}

export const config = {
  nodeEnv: env.NODE_ENV || 'development',
  databaseUrl: env.NODE_ENV === 'test' ? (env.DATABASE_URL_TEST || env.DATABASE_URL) : env.DATABASE_URL,
  jwtAccessSecret: env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'test' ? 'test_access_secret_1234' : undefined),
  jwtRefreshSecret: env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'test' ? 'test_refresh_secret_1234567890' : undefined),
  stripeSecret: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  appBaseUrl: env.APP_BASE_URL,
  sentryDsn: env.SENTRY_DSN
} as const;

export type Config = typeof config;

export default config;
