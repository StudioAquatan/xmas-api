import { Router } from 'express';
import Joi from 'joi';
import { lightController } from './light-controller';
import { RuleSet } from './models/condition';
import { RuleModel } from './models/rule';

const ruleValidator = Joi.object<Rule>({
  priority: Joi.number().required(),
  trigger: Joi.string()
    .valid('always', 'fav', 'retweet', 'reply', 'hashtag')
    .required(),
  triggerTweets: Joi.array().items(Joi.string().regex(/^\d+$/)),
  triggerHashtags: Joi.array().items(Joi.number().positive().allow(0)),
  condition: Joi.object<RuleSet>({
    type: Joi.string().valid('or', 'and', 'single', 'inv').required(),
    lhs: Joi.ref('ruleSet'),
    rhs: Joi.ref('ruleSet'),
    expr: Joi.ref('ruleSet'),
  }).id('ruleSet'),
  timeout: Joi.number().positive().allow(null, 0),
  targetPattern: Joi.number().positive().allow(0).required(),
});

interface Rule {
  priority: number;
  trigger: 'always' | 'fav' | 'retweet' | 'reply' | 'hashtag';
  triggerTweets?: string[];
  triggerHashtags?: number[];
  condition: RuleSet;
  timeout?: number;
  targetPattern: number;
}

export const ruleAPIRouter = Router();

ruleAPIRouter.put('/rules/:ruleId', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const ruleId = Number(req.params.ruleId);
  const rule = ruleValidator.validate(req.body, { stripUnknown: true });
  if (rule.error || isNaN(ruleId)) {
    return res.status(400).json(rule.error).end();
  }

  const dbRule = RuleModel.create({
    ...rule.value,
    ruleSetId: ruleId,
    triggerHashtags: rule.value.hashtagMonitor?.map((t) => t.toString()),
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
    rules[rule.ruleSetId] = rules[rule.ruleSetId] ?? [];
    rules[rule.ruleSetId].push(rule);
  }

  res.json(rules);
});

ruleAPIRouter.post('/rules/evaluate', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  lightController.start();

  res.status(200).end();
});

ruleAPIRouter.patch('/rules/:ruleId/:uuid', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const newRule = ruleValidator.validate(req.body, { stripUnknown: true });
  if (newRule.error) {
    return res.status(400).json(newRule.error).end();
  }

  const rule = await RuleModel.findOne({
    where: {
      id: req.params.uuid,
      ruleSetId: Number(req.params.ruleId),
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
      ruleSetId: Number(req.params.ruleId),
    },
  });

  if (!rule) {
    return res.status(404).end();
  }

  await rule.remove();

  res.status(200).end();
});
