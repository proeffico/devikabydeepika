const pino = require('pino');
module.exports = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.cookie', 'req.headers.authorization', '*.password', '*.otp', '*.code'] });
