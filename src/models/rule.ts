import { BaseEntity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { HashtagMonitorModel, TweetMonitorModel } from './monitor';

export class RuleModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id = '';

  @Column('int')
  ruleId = 0;

  @Column('int')
  priority = 0;

  @Column('enum', { enum: ['none', 'fav', 'retweet', 'reply', 'hashtag'] })
  event: 'none' | 'fav' | 'retweet' | 'reply' | 'hashtag' = 'none';

  @Column('simple-array')
  tweetMonitor: string[] = [];

  @Column('simple-array')
  hashtagMonitor: string[] = [];

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

  @Column('int', { nullable: true })
  timeout: number | null = null;

  @Column('int')
  targetPattern = 0;

  evaluateRange(tweets: TweetMonitorModel[], hashtag: HashtagMonitorModel[]) {
    const filteredHashtags = hashtag.filter(({ id }) =>
      this.hashtagMonitor.includes(id.toString()),
    );

    if (this.minHashtag !== null && filteredHashtags.length < this.minHashtag)
      return false;
    if (this.maxHashtag !== null && filteredHashtags.length > this.maxHashtag)
      return false;

    const filteredTweets = tweets.filter(({ tweetId }) =>
      this.tweetMonitor.includes(tweetId),
    );

    const favSum = filteredTweets.reduce(
      (count, { favCount }) => count + favCount,
      0,
    );

    if (this.minFav !== null && favSum < this.minFav) return false;
    if (this.maxFav !== null && favSum > this.maxFav) return false;

    const retweetSum = filteredTweets.reduce(
      (count, { retweetCount }) => count + retweetCount,
      0,
    );

    if (this.minRetweet !== null && retweetSum < this.minRetweet) return false;
    if (this.maxRetweet !== null && retweetSum > this.maxRetweet) return false;

    const replySum = filteredTweets.reduce(
      (count, { replyCount }) => count + replyCount,
      0,
    );

    if (this.minReply !== null && replySum < this.minReply) return false;
    if (this.maxReply !== null && replySum > this.maxReply) return false;

    return true;
  }
}
