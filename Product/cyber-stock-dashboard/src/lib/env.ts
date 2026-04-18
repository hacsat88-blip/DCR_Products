import { z } from "zod";

const ServerEnvSchema = z.object({
  JQUANTS_API_KEY: z.string().min(1).optional(),
  JQUANTS_REFRESH_TOKEN: z.string().min(1).optional(),
  ALPHA_VANTAGE_API_KEY: z.string().min(1).optional(),
  MARKETAUX_API_KEY: z.string().min(1).optional(),
  EDINETDB_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables: ${parsed.error.message}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function requireEnv<K extends keyof ServerEnv>(key: K): string {
  const env = getServerEnv();
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
}

export function __resetEnvCacheForTests(): void {
  cached = null;
}
