import { createHmac } from 'crypto';
import { Router } from 'express';
import { config } from './config';

export const webhookRouter = Router();

webhookRouter.get('/webhook', (req, res) => {
  if (typeof req.query?.crc_token === 'string') {
    const hash = createHmac('sha256', config.twitter.consumerSecret)
      .update(req.query.crc_token)
      .digest('base64');
    res.json({ response_token: `sha256=${hash}` });
  } else {
    res.status(400).end();
  }
});

webhookRouter.post('/webhook', (req, res) => {
  console.log(req.body);

  res.status(200).end();
});
