import { Router } from 'express';
import { config } from './config';
import { HashtagMonitorModel, TweetMonitorModel } from './models/monitor';
import { twitterStream } from './twitter-stream';
import { registerWebhook, subscribeWebhook } from './twitter-webhook-api';

export const restAPIRouter = Router();

restAPIRouter.post('/subscribeWebhook', async (req, res, next) => {
  try {
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
  } catch (e) {
    next(e);
  }
});

restAPIRouter.post('/useStream', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    twitterStream.setRunnerUser(req.user);
    twitterStream.start();

    req.user.useStream = true;
    await req.user.save();

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});

restAPIRouter.put('/monitor/hashtag', async (req, res, next) => {
  try {
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

    await HashtagMonitorModel.create({
      hashtag,
      count: 0,
    }).save();

    const newRule = await HashtagMonitorModel.findOne({ hashtag });

    if (!twitterStream.hasRunnerUser()) {
      twitterStream.setRunnerUser(req.user);
    }
    twitterStream.start();

    res.json({
      id: newRule?.id,
      hashtag: newRule?.hashtag,
      count: newRule?.count,
    });
  } catch (e) {
    next(e);
  }
});

restAPIRouter.get('/monitor/hashtag', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const rules = await HashtagMonitorModel.find();
    res.json(
      rules.map((rule) => ({
        id: rule.id,
        hashtag: rule.hashtag,
        count: rule.count,
        active: rule.active,
      })),
    );
  } catch (e) {
    next(e);
  }
});

restAPIRouter.delete('/monitor/hashtag/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const ruleId = Number(req.params.id);
    if (isNaN(ruleId)) {
      return res.status(400).end();
    }

    const rule = await HashtagMonitorModel.findOne({ id: ruleId });
    if (!rule) {
      return res.status(404).end();
    }

    rule.active = false;
    await rule.save();

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});

restAPIRouter.get('/monitor/tweet', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const rules = await TweetMonitorModel.find();
    res.json(
      rules.map((rule) => ({
        tweetId: rule.tweetId,
        replyCount: rule.replyCount,
        retweetCount: rule.retweetCount,
        favCount: rule.favCount,
      })),
    );
  } catch (e) {
    next(e);
  }
});

restAPIRouter.put('/monitor/tweet/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const tweetId = req.params.id;

    let rule = await TweetMonitorModel.findOne({ tweetId });
    if (!rule) {
      rule = TweetMonitorModel.create({
        tweetId,
      });
      await rule.save();
    }

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});

restAPIRouter.delete('/monitor/tweet/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const tweetId = req.params.id;

    const rule = await TweetMonitorModel.findOne({ tweetId });
    if (!rule) {
      return res.status(404).end();
    }

    await rule.remove();

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});
