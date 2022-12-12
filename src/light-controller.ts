import { BaseEntity, In } from 'typeorm';
import { lightInterface } from './light-interface';
import { HashtagMonitorModel, TweetMonitorModel } from './models/monitor';
import { RuleEventType, RuleModel } from './models/rule';

export type LightEvent =
  | {
      type: 'hashtag';
      sourceHashtag: number;
    }
  | {
      type: Exclude<RuleEventType, 'none' | 'hashtag'>;
      sourceTweetId: string;
    };

class LightController {
  private ruleTimer: Map<number, NodeJS.Timeout> = new Map();

  start() {
    this.evaluateAndApplyRules();
  }

  async update(event: LightEvent) {
    this.evaluateAndApplyRules(event);
  }

  private async evaluateAndApplyRules(event?: LightEvent) {
    console.log('evaluation');
    const ruleIds: Array<{ ruleId: number }> =
      await RuleModel.createQueryBuilder<{ ruleId: number } & BaseEntity>()
        .groupBy('ruleId')
        .select(['ruleId'])
        .execute();

    for (const { ruleId } of ruleIds) {
      const nextRule = await this.evaluateRule(ruleId, event);
      if (!nextRule) {
        console.error('No rule matched for', ruleId);
        continue;
      }

      if (this.ruleTimer.has(ruleId)) {
        clearTimeout(this.ruleTimer.get(ruleId)!);
      }
      if (nextRule.timeout) {
        this.ruleTimer.set(
          ruleId,
          setTimeout(() => {
            this.ruleTimer.delete(ruleId);
            this.evaluateAndApplyRules();
          }, nextRule.timeout * 1000),
        );
      }

      await lightInterface.applyPatternForRule(ruleId, nextRule.targetPattern);
    }
  }

  private async evaluateRule(id: number, event?: LightEvent) {
    const rules = await RuleModel.find({
      where: { ruleId: id },
      order: {
        priority: 'DESC',
      },
    });

    const eventMatchedRules = rules.filter((rule) => {
      switch (rule.event) {
        case 'none':
          return true;

        case 'fav':
          return (
            event?.type === 'fav' && rule.hasEventTweet(event.sourceTweetId)
          );
        case 'retweet':
          return (
            event?.type === 'retweet' && rule.hasEventTweet(event.sourceTweetId)
          );
        case 'reply':
          return (
            event?.type === 'reply' && rule.hasEventTweet(event.sourceTweetId)
          );

        case 'hashtag':
          return (
            event?.type === 'hashtag' &&
            rule.hasEventHashtag(event.sourceHashtag)
          );
      }
    });

    const { collectTweetIds, collectHashtagIds } = eventMatchedRules.reduce<{
      collectTweetIds: string[];
      collectHashtagIds: string[];
    }>(
      (
        { collectTweetIds, collectHashtagIds },
        { collectTweets, collectHashtags },
      ) => ({
        collectTweetIds: [...collectTweetIds, ...collectTweets],
        collectHashtagIds: [...collectHashtagIds, ...collectHashtags],
      }),
      { collectTweetIds: [], collectHashtagIds: [] },
    );

    const tweets = await TweetMonitorModel.find({
      where: { tweetId: In(collectTweetIds) },
    });
    const hashtags = await HashtagMonitorModel.find({
      where: { id: In(collectHashtagIds.map((id) => Number(id))) },
    });

    const matchedRule = eventMatchedRules.find((rule) =>
      rule.evaluateRange(tweets, hashtags),
    );

    return matchedRule;
  }
}

export const lightController = new LightController();
