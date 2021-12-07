import { Router } from 'express';
import { config } from './config';
import { HashtagMonitorModel } from './models/monitor';
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

restAPIRouter.put('/monitorTweet', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  let hashtag = req.body.hashtag;
  if (typeof hashtag !== 'string') {
    return res.status(400).end();
  }

  if (hashtag.startsWith('#')) {
    hashtag = hashtag.replace(/^#/, '');
  }

  const rule = await HashtagMonitorModel.findOne({ hashtag });
  if (rule) {
    return res.status(409).json({ error: 'Same rule found' });
  }

  await HashtagMonitorModel.insert({
    hashtag,
    count: 0,
  });

  const newRule = await HashtagMonitorModel.findOne({ hashtag });
  res.json({
    id: newRule?.id,
    hashtag: newRule?.hashtag,
    count: newRule?.count,
  });
});
