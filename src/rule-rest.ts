import { Router } from 'express';
import Joi from 'joi';
import { RuleModel } from './models/rule';

const ruleValidator = Joi.object<Rule>({
  priority: Joi.number().required(),
  event: Joi.string()
    .valid('none', 'fav', 'retweet', 'reply', 'hashtag')
    .required(),
  tweetMonitor: Joi.array().items(Joi.number()),
  hashtagMonitor: Joi.array().items(Joi.number()),
  minFav: Joi.number(),
  maxFav: Joi.number(),
  minRetweet: Joi.number(),
  maxRetweet: Joi.number(),
  minReply: Joi.number(),
  maxReply: Joi.number(),
  minHashtag: Joi.number(),
  maxHashtag: Joi.number(),
  minSum: Joi.number(),
  maxSum: Joi.number(),
  sumTarget: Joi.array().items(
    Joi.string().valid('none', 'fav', 'retweet', 'reply', 'hashtag'),
  ),
  timeout: Joi.number(),
  targetPattern: Joi.number().required(),
});

interface Rule {
  priority: number;
  event: 'none' | 'fav' | 'retweet' | 'reply' | 'hashtag';
  tweetMonitor?: string[];
  hashtagMonitor?: number[];
  minFav?: number;
  maxFav?: number;
  minRetweet?: number;
  maxRetweet?: number;
  minReply?: number;
  maxReply?: number;
  minHashtag?: number;
  maxHashtag?: number;
  sumTarget?: Array<'fav' | 'retweet' | 'reply' | 'hashtag'>;
  minSum?: number;
  maxSum?: number;
  timeout?: number;
  targetPattern: number;
}

export const ruleAPIRouter = Router();

ruleAPIRouter.put('/rules/:ruleId', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const ruleId = Number(req.params.ruleId);
  const rule = ruleValidator.validate(req.body);
  if (!rule.value || isNaN(ruleId)) {
    return res.status(400).json(rule.error).end();
  }

  const dbRule = RuleModel.create({
    ...rule.value,
    ruleId,
    hashtagMonitor: rule.value.hashtagMonitor?.map((t) => t.toString()),
  });
  await dbRule.save();

  res.json(dbRule);
});

ruleAPIRouter.get('/rules', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
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

ruleAPIRouter.patch('/rules/:ruleId/:uuid', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const newRule = ruleValidator.validate(req.body);
  if (!newRule.value) {
    return res.status(400).json(newRule.error).end();
  }

  const rule = await RuleModel.findOne({
    where: {
      id: req.params.uuid,
      ruleId: Number(req.params.ruleId),
    },
  });

  if (!rule) {
    return res.status(404).end();
  }

  const dbRuleValues = {
    ...newRule.value,
    hashtagMonitor: newRule.value.hashtagMonitor?.map((t) => t.toString()),
  };

  Object.assign(rule, dbRuleValues);

  await rule.save();

  res.json(rule);
});

ruleAPIRouter.delete('/rules/:ruleId/:uuid', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const rule = await RuleModel.findOne({
    where: {
      id: req.params.uuid,
      ruleId: Number(req.params.ruleId),
    },
  });

  if (!rule) {
    return res.status(404).end();
  }

  await rule.remove();

  res.status(200).end();
});
