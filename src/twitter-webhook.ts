import { createHmac } from 'crypto';
import { Router } from 'express';
import { ActivityEmitter, ActivityEvent } from 'twict';
import { TweetV1 } from 'twitter-api-v2';
import { config } from './config';
import { TweetMonitorModel } from './models/monitor';
import { UserModel } from './models/user';

export const webhookRouter = Router();

const event = new ActivityEmitter();

webhookRouter.get('/webhook', (req, res) => {
  if (typeof req.query?.crc_token === 'string') {
    const hash = createHmac('sha256', config.twitter.consumerSecret)
      .update(req.query.crc_token)
      .digest('base64');
    res.json({ response_token: `sha256=${hash}` });
  } else {
    res.status(400).end();
  }
});

webhookRouter.post('/webhook', (req, res) => {
  console.log(req.body);
  res.status(200).end();
  event.emitEvent(req.body as ActivityEvent);
});

event.onTweetCreate(async (response) => {
  try {
    const user = await UserModel.findOne({ userId: response.for_user_id });
    if (!user) return;

    for (const tweet of response.tweet_create_events as unknown as TweetV1[]) {
      if (tweet.in_reply_to_status_id_str) {
        const monitor = await TweetMonitorModel.findOne({
          tweetId: tweet.in_reply_to_status_id_str,
        });
        if (!monitor) continue;

        console.log('reply', monitor.tweetId, '->', tweet.id_str, tweet.text);
        await TweetMonitorModel.createQueryBuilder()
          .update()
          .where({
            tweetId: monitor.tweetId,
          })
          .set({ replyCount: () => 'replyCount + 1' })
          .execute();
      } else if (
        tweet.retweeted_status?.id_str &&
        user.userId !== tweet.user.id_str
      ) {
        const monitor = await TweetMonitorModel.findOne({
          tweetId: tweet.retweeted_status?.id_str,
        });
        if (!monitor) continue;
        console.log(
          'retweet',
          monitor.tweetId,
          ' -> ',
          tweet.id_str,
          tweet.user.screen_name,
          'count:',
          tweet.retweeted_status?.retweet_count,
        );
        await TweetMonitorModel.createQueryBuilder()
          .update()
          .where({
            tweetId: monitor.tweetId,
          })
          .set({
            retweetCount: tweet.retweeted_status?.retweet_count,
            favCount: tweet.retweeted_status?.favorite_count,
            replyCount: tweet.retweeted_status?.reply_count,
          })
          .execute();
      }
    }
  } catch (e) {
    console.error(e);
  }
});

event.onFavorite(async (response) => {
  try {
    const user = await UserModel.findOne({ userId: response.for_user_id });
    if (!user) return;

    for (const fav of response.favorite_events) {
      const monitor = await TweetMonitorModel.findOne({
        tweetId: fav.favorited_status.id_str,
      });
      if (!monitor) continue;
      console.log(
        'fav',
        monitor.tweetId,
        ' by ',
        fav.favorited_status.user.screen_name,
        'count:',
        fav.favorited_status.favorite_count,
      );
      await TweetMonitorModel.createQueryBuilder()
        .update()
        .where({
          tweetId: monitor.tweetId,
        })
        .set({
          favCount: fav.favorited_status.favorite_count,
          retweetCount: fav.favorited_status.retweet_count,
          replyCount: fav.favorited_status.reply_count,
        })
        .execute();
    }
  } catch (e) {
    console.error(e);
  }
});
