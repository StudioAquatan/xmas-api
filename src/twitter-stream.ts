import { ETwitterStreamEvent, TweetStream, TweetV1 } from 'twitter-api-v2';
import { HashtagMonitorModel } from './models/monitor';
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
        .join(' '),
      autoConnect: true,
    });

    this.stream.on(ETwitterStreamEvent.Data, (data) => {
      console.log(data);
    });

    await this.stream.connect();
  };

  private getAllHashtags = async () => {
    const hashtags = await HashtagMonitorModel.find();

    return hashtags.map(({ hashtag }) => hashtag);
  };

  setRunnerUser = (user: UserModel) => {
    this.runnerUser = user;
  };

  start = async () => {
    if (!this.runnerUser) {
      throw new Error('runnerUser is not set');
    }
    if (this.stream) {
      this.stream.close();
    }

    const hashtags = await this.getAllHashtags();
    if (hashtags.length > 0) {
      await sleep(1000);

      console.log('Stream listener start');
      this.startStreamForHashtags(this.runnerUser, await this.getAllHashtags());
    }
  };
}

export const twitterStream = new TwitterStream();
