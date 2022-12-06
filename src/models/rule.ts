import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { HashtagMonitorModel, TweetMonitorModel } from './monitor';

export type RuleEventType = 'none' | 'fav' | 'retweet' | 'reply' | 'hashtag';

@Entity()
export class RuleModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column('int')
  ruleId = 0;

  @Column('int')
  priority = 0;

  // @Column('enum', { enum: ['none', 'fav', 'retweet', 'reply', 'hashtag'] })
  @Column('text')
  event: RuleEventType = 'none';

  @Column('simple-array')
  eventTweets: string[] = [];

  @Column('simple-array')
  eventHashtags: string[] = [];

  @Column('simple-array')
  collectTweets: string[] = [];

  @Column('simple-array')
  collectHashtags: string[] = [];

  @Column('int', { nullable: true })
  minFav: number | null = null;

  @Column('int', { nullable: true })
  maxFav: number | null = null;

  @Column('int', { nullable: true })
  minRetweet: number | null = null;

  @Column('int', { nullable: true })
  maxRetweet: number | null = null;

  @Column('int', { nullable: true })
  minReply: number | null = null;

  @Column('int', { nullable: true })
  maxReply: number | null = null;

  @Column('int', { nullable: true })
  minHashtag: number | null = null;

  @Column('int', { nullable: true })
  maxHashtag: number | null = null;

  @Column('simple-array')
  sumTarget: Array<'fav' | 'retweet' | 'reply' | 'hashtag'> = [];

  @Column('int', { nullable: true })
  minSum: number | null = null;

  @Column('int', { nullable: true })
  maxSum: number | null = null;

  @Column('int', { nullable: true })
  timeout: number | null = null;

  @Column('int')
  targetPattern = 0;

  hasCollectTweet(id: string) {
    return this.collectTweets.includes(id);
  }

  hasEventTweet(id: string) {
    return this.eventTweets.includes(id);
  }

  hasCollectHashtag(id: number) {
    return this.collectHashtags.find(
      (hashtagStr) => hashtagStr === id.toString(),
    );
  }

  hasEventHashtag(id: number) {
    return this.eventHashtags.find(
      (hashtagStr) => hashtagStr === id.toString(),
    );
  }

  evaluateRange(tweets: TweetMonitorModel[], hashtag: HashtagMonitorModel[]) {
    const filteredHashtags = hashtag.filter(
      ({ id }) => id && this.collectHashtags.includes(id.toString()),
    );

    const filteredTweets = tweets.filter(({ tweetId }) =>
      this.collectTweets.includes(tweetId),
    );

    const favSum = filteredTweets.reduce(
      (count, { favCount }) => count + favCount,
      0,
    );

    const retweetSum = filteredTweets.reduce(
      (count, { retweetCount }) => count + retweetCount,
      0,
    );

    const replySum = filteredTweets.reduce(
      (count, { replyCount }) => count + replyCount,
      0,
    );

    if (this.minHashtag !== null && filteredHashtags.length < this.minHashtag)
      return false;
    if (this.maxHashtag !== null && filteredHashtags.length > this.maxHashtag)
      return false;
    if (this.minReply !== null && replySum < this.minReply) return false;
    if (this.maxReply !== null && replySum > this.maxReply) return false;
    if (this.minRetweet !== null && retweetSum < this.minRetweet) return false;
    if (this.maxRetweet !== null && retweetSum > this.maxRetweet) return false;
    if (this.minFav !== null && favSum < this.minFav) return false;
    if (this.maxFav !== null && favSum > this.maxFav) return false;
    if (this.sumTarget.length > 0) {
      const sumTarget: number[] = [];
      if (this.sumTarget.includes('fav')) sumTarget.push(favSum);
      if (this.sumTarget.includes('hashtag'))
        sumTarget.push(filteredHashtags.length);
      if (this.sumTarget.includes('reply')) sumTarget.push(replySum);
      if (this.sumTarget.includes('retweet')) sumTarget.push(retweetSum);

      const sum = sumTarget.reduce((p, c) => p + c, 0);
      if (this.minSum !== null && sum < this.minSum) return false;
      if (this.maxSum !== null && sum > this.maxSum) return false;
    }

    return true;
  }
}
