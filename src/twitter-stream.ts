import { ETwitterStreamEvent, TweetStream, TweetV1 } from 'twitter-api-v2';
import { lightController } from './light-controller';
import { HashtagMonitorModel, HashtagTweet } from './models/monitor';
import { UserModel } from './models/user';
import { sleep } from './utils';

class TwitterStream {
  private stream: TweetStream<TweetV1> | null = null;
  private runnerUser: UserModel | null = null;
  private startStreamForHashtags = async (
    user: UserModel,
    hashtag: string[],
  ) => {
    const client = user.getClient();
    this.stream = await client.readOnly.v1.filterStream({
      track: hashtag
        .map((ht) => (ht.startsWith('#') ? ht : `#${ht}`))
        .join(','),
      autoConnect: true,
    });

    this.stream.autoReconnect = true;

    this.stream.on(ETwitterStreamEvent.Data, async (data) => {
      if (data.retweeted_status) return;
      const hashtags = await HashtagMonitorModel.find({ active: true });
      const matchedTag = hashtags.find(({ hashtag }) =>
        data.entities.hashtags?.find(
          ({ text }) => text.replace(/#/, '') === hashtag,
        ),
      );
      if (!matchedTag) return;

      console.log('hashtag increase', matchedTag.hashtag);

      await HashtagMonitorModel.createQueryBuilder()
        .update()
        .where({
          id: matchedTag.id,
        })
        .set({ count: () => 'count + 1' })
        .execute();

      await HashtagTweet.create({
        tweetId: data.id_str,
        text: data.text,
        userId: data.user.id_str,
        screenName: data.user.screen_name,
        tweetAt: data.created_at,
        ruleId: matchedTag.id,
      }).save();

      lightController.update('hashtag');
    });

    await this.stream.connect();
  };

  private getAllHashtags = async () => {
    const hashtags = await HashtagMonitorModel.find({ active: true });

    return hashtags.map(({ hashtag }) => hashtag);
  };

  setRunnerUser = (user: UserModel) => {
    this.runnerUser = user;
  };

  hasRunnerUser = () => {
    return !!this.runnerUser;
  };

  start = async () => {
    if (!this.runnerUser) {
      throw new Error('runnerUser is not set');
    }
    if (this.stream) {
      this.stream.close();
      await sleep(1000);
    }

    const hashtags = await this.getAllHashtags();
    if (hashtags.length > 0) {
      console.log('Stream listener start', this.runnerUser.screenName);
      this.startStreamForHashtags(this.runnerUser, await this.getAllHashtags());
    }
  };
}

export const twitterStream = new TwitterStream();
