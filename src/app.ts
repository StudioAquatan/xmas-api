import { urlencoded, json } from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { createConnection } from 'typeorm';
import { config } from './config';
import {
  HashtagMonitorModel,
  HashtagTweet,
  TweetMonitorModel,
} from './models/monitor';
import { UserModel } from './models/user';

passport.use(
  new TwitterStrategy(
    {
      callbackURL: config.twitter.callback,
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
    },
    async (accessToken, accessSecret, profile, done) => {
      let user = await UserModel.findOne(profile.id);
      if (!user) {
        user = UserModel.create({
          userId: profile.id,
          accessToken,
          accessSecret,
          screenName: profile.username,
        });
      }
      user.accessToken = accessToken;
      user.accessSecret = accessSecret;

      await user.save();

      done(null, profile.id);
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (id, done) => {
  const user = await UserModel.findOne(id as string);
  done(null, user);
});

const app = express();

app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(session({ secret: 'keyboard cat' }));
app.use(morgan('combined'));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/twitter/login', passport.authenticate('twitter'));

(async () => {
  await createConnection({
    entities: [UserModel, TweetMonitorModel, HashtagMonitorModel, HashtagTweet],
    type: 'sqlite',
    database: './data.db',
    synchronize: true,
  });
  console.log('Database connection established');
  app.listen(3000, () => console.log('Http server started'));
})();
