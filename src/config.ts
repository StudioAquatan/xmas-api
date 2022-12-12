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
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
    dataEndpoint: process.env.AWS_IOT_DATA_ENDPOINT ?? '',
  },
  sessionSecret: process.env.SESSION_SECRET ?? 'nyancat',
};
