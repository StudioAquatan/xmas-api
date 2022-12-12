import { urlencoded, json } from 'body-parser';
import { TypeormStore, ISession } from 'connect-typeorm';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { DataSource } from 'typeorm';
import { config } from './config';
import { deviceAPIRouter } from './device-rest';
import { lightController } from './light-controller';
import {
  HashtagMonitorModel,
  HashtagTweet,
  ReplyTweet,
  TweetMonitorModel,
} from './models/monitor';
import { RuleModel } from './models/rule';
import { SessionModel } from './models/session';
import { UserModel } from './models/user';
import { ruleAPIRouter } from './rule-rest';
import { restAPIRouter } from './twitter-rest';
import { twitterStream } from './twitter-stream';
import { webhookRouter } from './twitter-webhook';
import { registerWebhook } from './twitter-webhook-api';

passport.use(
  new TwitterStrategy(
    {
      callbackURL: config.twitter.callback,
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
    },
    async (accessToken, accessSecret, profile, done) => {
      try {
        let user = await UserModel.findOne({ where: { userId: profile.id } });
        if (!user) {
          user = UserModel.create({
            userId: profile.id,
            accessToken,
            accessSecret,
            screenName: profile.username,
            displayName: profile.displayName,
            iconUrl: profile.photos?.at(0)?.value,
          });
        }
        user.accessToken = accessToken;
        user.accessSecret = accessSecret;

        if (!user.webhookActivated) {
          await registerWebhook(
            user,
            config.twitter.webhookEnv,
            config.twitter.webhookUrl,
          );
          user.webhookActivated = true;
        }

        await user.save();

        if (!config.twitter.allowedId.includes(profile.id)) {
          done('Not allowed');
        } else {
          done(null, profile.id);
        }
      } catch (e) {
        done(e);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (id, done) => {
  const user = await UserModel.findOne({ where: { userId: id as string } });
  done(null, user);
});

(async () => {
  const connection = new DataSource({
    entities: [
      UserModel,
      TweetMonitorModel,
      HashtagMonitorModel,
      HashtagTweet,
      SessionModel,
      ReplyTweet,
      RuleModel,
    ],
    type: 'sqlite',
    database: './data.db',
    synchronize: true,
  });
  await connection.initialize();
  console.log('Database connection established');

  const app = express();

  app.use(morgan('combined'));
  app.use(cookieParser());
  app.use(urlencoded({ extended: true }));
  app.use(json());

  const sessionRepository = connection.getRepository<ISession>(SessionModel);
  app.use(
    '/api',
    session({
      secret: config.sessionSecret,
      saveUninitialized: false,
      store: new TypeormStore({
        cleanupLimit: 2,
        limitSubquery: false, // If using MariaDB.
        ttl: 86400,
      }).connect(sessionRepository),
    }),
  );

  app.use(passport.initialize());
  app.use('/api', passport.session());

  app.get(
    '/api/twitter/login',
    (req, res, next) => {
      if (req.user) {
        res.redirect('/');
      } else {
        next();
      }
    },
    passport.authenticate('twitter', {
      successRedirect: '/',
      successReturnToOrRedirect: '/',
    }),
  );
  app.use('/api/twitter', webhookRouter);
  app.use('/api/twitter', restAPIRouter);
  app.use('/api', ruleAPIRouter);
  app.use('/api/devices', deviceAPIRouter);

  app.use('/', express.static('./public'));

  app.listen(3000, () => console.log('Http server started'));

  const user = await UserModel.findOne({ where: { useStream: true } });
  if (user) {
    twitterStream.setRunnerUser(user);
    twitterStream.start();
  }

  lightController.start();
})();
