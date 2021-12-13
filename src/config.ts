import { config as dotenv } from 'dotenv';

dotenv();

export const config = {
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY ?? '',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? '',
    bearerToken: process.env.TWITTER_BEARER_TOKEN ?? '',
    callback:
      process.env.TWITTER_CALLBACK ?? 'http://localhost:3000/api/twitter/login',
    webhookUrl:
      process.env.TWITTER_WEBHOOK_URL ??
      'http://localhost:3000/api/twitter/webhook',
    webhookEnv: process.env.TWITTER_WEBHOOK_ENV ?? 'development',
    allowedId: (process.env.TWITTER_ALLOWED_ID ?? '').split(/,/),
  },
  iot: {
    projectId: process.env.GOOGLE_PROJECT_ID ?? '',
    region: process.env.GOOGLE_PROJECT_REGION ?? '',
    registry: process.env.GOOGLE_IOT_REGISTRY ?? '',
  },
  sessionSecret: process.env.SESSION_SECRET ?? 'nyancat',
};
