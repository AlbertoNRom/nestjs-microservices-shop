import 'dotenv/config';
import { z } from 'zod';

const envsSchema = z.object({
  PORT: z.coerce.number(),
  NATS_SERVERS: z.array(z.string())
});

const { data, error } = envsSchema.safeParse({
  ...process.env, 
  NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = {
  port: data.PORT,
  natsServers: data.NATS_SERVERS
};
