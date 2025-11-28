import 'dotenv/config';
import { z } from 'zod';

const envsSchema = z.object({
  PORT: z.coerce.number().default(3000),
  STRIPE_SECRET: z.string(),
  STRIPE_SUCCESS_URL: z.string(),
  STRIPE_CANCEL_URL: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  NATS_SERVERS: z.array(z.string()),    
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
  stripeSecret: data.STRIPE_SECRET,
  stripeSuccessUrl: data.STRIPE_SUCCESS_URL,
  stripeCancelUrl: data.STRIPE_CANCEL_URL,
  stripeWebhookSecret: data.STRIPE_WEBHOOK_SECRET,
  natsServers: data.NATS_SERVERS,
};
