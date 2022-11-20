import { In } from 'typeorm';
import { HashtagMonitorModel, TweetMonitorModel } from './monitor';

export interface RuleSetBinary {
  type: 'or' | 'and';
  lhs: RuleSetCondition | RuleSetBinary | RuleSetUnary;
  rhs: RuleSetCondition | RuleSetBinary | RuleSetUnary;
}

export interface RuleSetUnary {
  type: 'inv' | 'single';
  expr: RuleSetCondition | RuleSetBinary | RuleSetUnary;
}

export interface RuleSetTweetSource {
  type: 'tweet';
  targets: string[];
  sum: Array<'fav' | 'retweet' | 'reply'>;
}

export interface RuleSetHashtagSource {
  type: 'hashtag';
  targets: number[];
}

export interface RuleSetCondition {
  type: 'condition';
  source: RuleSetTweetSource | RuleSetHashtagSource;
  min: number | null;
  max: number | null;
}

export type RuleSet = RuleSetBinary | RuleSetUnary;

async function evaluateTweetSource({
  targets,
  sum,
}: RuleSetTweetSource): Promise<number> {
  const tweets = await TweetMonitorModel.find({
    where: {
      tweetId: In(targets),
    },
  });

  const sumValue: number[] = [];
  if (sum.includes('fav'))
    sumValue.push(...tweets.map(({ favCount }) => favCount));

  if (sum.includes('reply'))
    sumValue.push(...tweets.map(({ replyCount }) => replyCount));

  if (sum.includes('retweet'))
    sumValue.push(...tweets.map(({ retweetCount }) => retweetCount));

  return sumValue.reduce((sum, curr) => sum + curr, 0);
}

async function evaluateHashtagSource({
  targets,
}: RuleSetHashtagSource): Promise<number> {
  const monitors = await HashtagMonitorModel.find({
    where: {
      id: In(targets),
    },
  });

  return monitors
    .map(({ count }) => count)
    .reduce((sum, curr) => sum + curr, 0);
}

async function evaluateSource(
  source: RuleSetTweetSource | RuleSetHashtagSource,
): Promise<number> {
  switch (source.type) {
    case 'hashtag':
      return evaluateHashtagSource(source);
    case 'tweet':
      return evaluateTweetSource(source);
  }
}

async function evaluateCondition({
  source,
  min,
  max,
}: RuleSetCondition): Promise<boolean> {
  const sum = await evaluateSource(source);
  if (min != null && sum < min) return false;
  if (max != null && sum > max) return false;
  return true;
}

async function evaluateBinary({ type, lhs, rhs }: RuleSetBinary) {
  const left = await evaluate(lhs);
  const right = await evaluate(rhs);

  switch (type) {
    case 'and':
      return left && right;
    case 'or':
      return left || right;
  }
}

async function evaluateUnary({ type, expr }: RuleSetUnary) {
  const result = await evaluate(expr);

  switch (type) {
    case 'inv':
      return !result;
    case 'single':
      return result;
  }
}

async function evaluate(
  rule: RuleSetCondition | RuleSetBinary | RuleSetUnary,
): Promise<boolean> {
  switch (rule.type) {
    case 'condition':
      return evaluateCondition(rule);
    case 'and':
    case 'or':
      return evaluateBinary(rule);
    case 'inv':
    case 'single':
      return evaluateUnary(rule);
  }
}
