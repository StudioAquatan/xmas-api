import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { HashtagMonitorModel, TweetMonitorModel } from './monitor';

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
  event: 'none' | 'fav' | 'retweet' | 'reply' | 'hashtag' = 'none';

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

    console.log(this.id, 'stats', [
      favSum,
      retweetSum,
      replySum,
      filteredHashtags.length,
    ]);

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
      let sum = 0;
      if (this.sumTarget.includes('fav')) sum += favSum;
      if (this.sumTarget.includes('hashtag')) sum += filteredHashtags.length;
      if (this.sumTarget.includes('reply')) sum += replySum;
      if (this.sumTarget.includes('retweet')) sum += retweetSum;

      console.log(this.id, 'sum', sum);

      if (this.minSum !== null && sum < this.minSum) return false;
      if (this.maxSum !== null && sum > this.maxSum) return false;
    }

    return true;
  }
}
