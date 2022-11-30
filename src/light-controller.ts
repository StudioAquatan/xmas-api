import { BaseEntity, In } from 'typeorm';
import { lightInterface } from './light-interface';
import { HashtagMonitorModel, TweetMonitorModel } from './models/monitor';
import { RuleModel } from './models/rule';

type LightEvent = 'fav' | 'retweet' | 'reply' | 'hashtag';
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
      where: { ruleSetId: id },
      order: {
        priority: 'DESC',
      },
    });

    const { tweetIds, hashtagIds } = rules.reduce<{
      tweetIds: string[];
      hashtagIds: string[];
    }>(
      (
        { tweetIds, hashtagIds },
        { triggerTweets: tweetMonitor, triggerHashtags: hashtagMonitor },
      ) => ({
        tweetIds: [...tweetIds, ...tweetMonitor],
        hashtagIds: [...hashtagIds, ...hashtagMonitor],
      }),
      { tweetIds: [], hashtagIds: [] },
    );

    const tweets = await TweetMonitorModel.find({ tweetId: In(tweetIds) });
    const hashtags = await HashtagMonitorModel.find({
      id: In(hashtagIds.map((id) => Number(id))),
    });

    const matchedRule = rules.find(
      (rule) =>
        rule.evaluateRange(tweets, hashtags) &&
        (rule.trigger == 'none' || rule.trigger === event),
    );

    return matchedRule;
  }
}

export const lightController = new LightController();
