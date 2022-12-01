import { Router } from 'express';
import { config } from './config';
import { HashtagMonitorModel, TweetMonitorModel } from './models/monitor';
import { RuleModel } from './models/rule';
import { twitterStream } from './twitter-stream';
import {
  getWebhookList,
  registerWebhook,
  subscribeWebhook,
} from './twitter-webhook-api';

export const restAPIRouter = Router();

restAPIRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    res.json({
      userId: req.user.userId,
      screenName: req.user.screenName,
      webhookActivated: req.user.webhookActivated,
      useStream: req.user.useStream,
    });
  } catch (e) {
    next(e);
  }
});

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

    if (!twitterStream.hasRunnerUser()) {
      twitterStream.setRunnerUser(req.user);
    }
    twitterStream.start();

    req.user.useStream = true;
    await req.user.save();

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});

restAPIRouter.get('/webhookStatus', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).end();
    }

    const list = await getWebhookList(config.twitter.webhookEnv);

    res.json(list);
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

    const monitor = await HashtagMonitorModel.create({
      hashtag,
      count: 0,
    }).save();

    if (!twitterStream.hasRunnerUser()) {
      twitterStream.setRunnerUser(req.user);
    }
    twitterStream.start();

    res.json(monitor);
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
    res.json(rules.map((rule) => rule));
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

    for (const { collectHashtags, eventHashtags } of await RuleModel.find()) {
      if ([...collectHashtags, ...eventHashtags].includes(ruleId.toString())) {
        return res.status(400).json({ error: 'Hashtag is used in rule' }).end();
      }
    }

    const rule = await HashtagMonitorModel.findOne({ where: { id: ruleId } });
    if (!rule) {
      return res.status(404).end();
    }

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
    res.json(rules.map((rule) => rule));
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

    let rule = await TweetMonitorModel.findOne({ where: { tweetId } });
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

    const rule = await TweetMonitorModel.findOne({ where: { tweetId } });
    if (!rule) {
      return res.status(404).end();
    }

    await rule.remove();

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});
