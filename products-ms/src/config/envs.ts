import 'dotenv/config';
import { z } from 'zod';

const envsSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  NATS_SERVERS: z.array(z.string())
});

const { data, error } = envsSchema.safeParse({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = {
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  natsServers: data.NATS_SERVERS,
};
