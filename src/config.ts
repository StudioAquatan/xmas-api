import { config as dotenv } from 'dotenv';

dotenv();

export const config = {
  twitter: {
    consumerKey: process.env.TWITTER_CONSUMER_KEY ?? '',
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? '',
    callback:
      process.env.TWITTER_CALLBACK ?? 'http://localhost:3000/api/twitter/login',
  },
  instagram: {
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN ?? '',
  },
};
