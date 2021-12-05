import { urlencoded, json } from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import passport from 'passport';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { config } from './config';

passport.use(
  new TwitterStrategy(
    {
      callbackURL: config.twitter.callback,
      consumerKey: config.twitter.consumerKey,
      consumerSecret: config.twitter.consumerSecret,
    },
    (accessToken, accessSecret, profile, done) => {
      console.log(accessToken, accessSecret, profile);
      done(null, profile.id);
    },
  ),
);

const app = express();

app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(session({ secret: 'keyboard cat' }));
app.use(morgan('combined'));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/twitter/login', passport.authenticate('twitter'));

app.listen(3000);
