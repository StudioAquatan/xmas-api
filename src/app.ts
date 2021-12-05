import { urlencoded } from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import passport from 'passport';

const app = express();

app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/twitter/login');

app.listen(3000);
