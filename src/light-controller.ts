import { BaseEntity, In } from 'typeorm';
import { lightInterface } from './light-interface';
import { HashtagMonitorModel, TweetMonitorModel } from './models/monitor';
import { RuleEventType, RuleModel } from './models/rule';

export interface LightEvent {
  type: Exclude<RuleEventType, 'none'>;
  sourceTweetId?: string;
  sourceHashtag?: number;
}

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

      if (nextRule.timeout) {
        if (this.ruleTimer.has(ruleId)) {
          clearTimeout(this.ruleTimer.get(ruleId)!);
        }
        this.ruleTimer.set(
          ruleId,
          setTimeout(() => {
            this.ruleTimer.delete(ruleId);
            this.evaluateAndApplyRules();
          }, nextRule.timeout),
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
      if (
        event?.type === 'hashtag' &&
        event.sourceHashtag &&
        !rule.hasEventHashtag(event.sourceHashtag)
      )
        return false;

      if (
        event?.type !== 'hashtag' &&
        event?.sourceTweetId &&
        !rule.hasEventTweet(event.sourceTweetId)
      )
        return false;

      return true;
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
