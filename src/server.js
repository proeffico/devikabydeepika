const app = require('./app');
const cfg = require('./config');
const logger = require('./logger');
const db = require('./db');
db.raw('select 1').then(() => {
  app.listen(cfg.port, () => logger.info(`Devikka store listening on :${cfg.port} (${cfg.env})`));
}).catch((e) => { logger.error(e, 'database unreachable'); process.exit(1); });
