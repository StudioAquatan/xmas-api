import { Router } from 'express';
import z from 'zod';
import { lightController } from './light-controller';
import { RuleModel } from './models/rule';

const tweetEventLiteral = z
  .literal('fav')
  .or(z.literal('retweet'))
  .or(z.literal('reply'))
  .or(z.literal('hashtag'));
const ruleValidator = z
  .object({
    priority: z.number(),
    event: z.literal('none').or(tweetEventLiteral),
    eventTweets: z.array(z.string().regex(/^\d+$/)),
    eventHashtags: z.array(z.number().nonnegative()),
    collectTweets: z.array(z.string().regex(/^\d+$/)),
    collectHashtags: z.array(z.number().nonnegative()),
    minFav: z.number().nonnegative().nullable(),
    maxFav: z.number().nonnegative().nullable(),
    minRetweet: z.number().nonnegative().nullable(),
    maxRetweet: z.number().nonnegative().nullable(),
    minReply: z.number().nonnegative().nullable(),
    maxReply: z.number().nonnegative().nullable(),
    minHashtag: z.number().nonnegative().nullable(),
    maxHashtag: z.number().nonnegative().nullable(),
    minSum: z.number().nonnegative().nullable(),
    maxSum: z.number().nonnegative().nullable(),
    sumTarget: z.array(tweetEventLiteral),
    timeout: z.number().nonnegative().nullable(),
    targetPattern: z.number().nonnegative(),
  })
  .strict();

export const ruleAPIRouter = Router();

ruleAPIRouter.put('/rules/:ruleId', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const ruleId = Number(req.params.ruleId);
  if (isNaN(ruleId)) {
    res.status(400).json({ error: 'Unknown rule id' }).end();
    return;
  }
  const rule = ruleValidator.safeParse(req.body);
  if (!rule.success) {
    res.status(400).json(rule.error).end();
    return;
  }

  const dbRule = RuleModel.create({
    ...rule.data,
    ruleId,
    collectHashtags: rule.data.collectHashtags?.map((t) => t.toString()),
    eventHashtags: rule.data.eventHashtags?.map((t) => t.toString()),
  });
  await dbRule.save();

  res.json(dbRule);
});

ruleAPIRouter.get('/rules', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const rules: Record<number, RuleModel[]> = {};
  const ruleArray = await RuleModel.find({
    order: {
      priority: 'DESC',
    },
  });

  for (const rule of ruleArray) {
    rules[rule.ruleId] = rules[rule.ruleId] ?? [];
    rules[rule.ruleId].push(rule);
  }

  res.json(rules);
});

ruleAPIRouter.post('/rules/evaluate', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  lightController.start();

  res.status(200).end();
});

ruleAPIRouter.patch('/rules/:ruleId/:uuid', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const newRule = ruleValidator.safeParse(req.body);
  if (!newRule.success) {
    res.status(400).json(newRule.error).end();
    return;
  }

  const rule = await RuleModel.findOne({
    where: {
      id: req.params.uuid,
      ruleId: Number(req.params.ruleId),
    },
  });

  if (!rule) {
    res.status(404).end();
    return;
  }

  const dbRuleValues = {
    ...newRule.data,
    collectHashtags: newRule.data.collectHashtags?.map((t) => t.toString()),
    eventHashtags: newRule.data.eventHashtags?.map((t) => t.toString()),
  };

  Object.assign(rule, dbRuleValues);

  await rule.save();

  res.json(rule);
});

ruleAPIRouter.delete('/rules/:ruleId/:uuid', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const rule = await RuleModel.findOne({
    where: {
      id: req.params.uuid,
      ruleId: Number(req.params.ruleId),
    },
  });

  if (!rule) {
    res.status(404).end();
    return;
  }

  await rule.remove();

  res.status(200).end();
});
