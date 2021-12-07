import { urlencoded, json } from 'body-parser';
import { TypeormStore, ISession } from 'connect-typeorm';
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
import { SessionModel } from './models/session';
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

(async () => {
  const connection = await createConnection({
    entities: [
      UserModel,
      TweetMonitorModel,
      HashtagMonitorModel,
      HashtagTweet,
      SessionModel,
    ],
    type: 'sqlite',
    database: './data.db',
    synchronize: true,
  });
  console.log('Database connection established');

  const app = express();

  app.use(cookieParser());
  app.use(urlencoded({ extended: true }));
  app.use(json());

  const sessionRepository = connection.getRepository<ISession>(SessionModel);
  app.use(
    session({
      secret: 'keyboard cat',
      store: new TypeormStore({
        cleanupLimit: 2,
        limitSubquery: false, // If using MariaDB.
        ttl: 86400,
      }).connect(sessionRepository),
    }),
  );

  app.use(morgan('combined'));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/twitter/login', passport.authenticate('twitter'));
  app.listen(3000, () => console.log('Http server started'));
})();
