import { Router } from 'express';
import { config } from './config';
import { registerWebhook, subscribeWebhook } from './twitter-webhook-api';

export const restAPIRouter = Router();

restAPIRouter.post('/subscribeWebhook', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const id = await registerWebhook(
    req.user,
    config.twitter.webhookEnv,
    config.twitter.webhookUrl,
  );
  console.log('webhook id', id);
  await subscribeWebhook(req.user, config.twitter.webhookEnv);

  res.status(200).end();
});
