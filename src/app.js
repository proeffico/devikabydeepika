const path = require('path');
const express = require('express');
const compression = require('compression');
const pinoHttp = require('pino-http');
const cfg = require('./config');
const logger = require('./logger');
const sec = require('./middleware/security');
const session = require('./middleware/session');
const locale = require('./middleware/locale');
const errors = require('./middleware/errors');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', cfg.trustProxy);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', cfg.isProd);

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url.startsWith('/img') || req.url.startsWith('/css') || req.url.startsWith('/js') } }));
app.use(sec.helmetMw);
app.use(compression());
app.use(sec.globalLimiter);

// Webhooks: raw body, before any parser / session / CSRF.
app.use(require('./routes/webhooks'));

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: cfg.isProd ? '7d' : 0, etag: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(express.json({ limit: '64kb' }));
app.use(sec.hpp);
app.use(session);
app.use(locale);
app.use(sec.csrf);
app.use(sec.formTimer);

app.use(require('./routes/admin'));
app.use(require('./routes/store'));
app.use(require('./routes/commerce'));
app.use(require('./routes/account'));

app.use(errors.notFound);
app.use(errors.handler);
module.exports = app;
