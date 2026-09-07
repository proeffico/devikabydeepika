const session = require('express-session');
const { ConnectSessionKnexStore } = require('connect-session-knex');
const db = require('../db');
const cfg = require('../config');

const store = new ConnectSessionKnexStore({ knex: db, tableName: 'sessions', createTable: false, cleanupInterval: 15 * 60 * 1000 });

module.exports = session({
  name: 'dvk.sid',
  secret: cfg.sessionSecret || 'dev-secret',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: cfg.cookieSecure, maxAge: 14 * 24 * 60 * 60 * 1000 },
});
