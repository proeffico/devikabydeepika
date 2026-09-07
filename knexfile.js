require('dotenv').config();
const base = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'devikka',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'devikka',
    socketPath: process.env.DB_SOCKET || undefined,
    charset: 'utf8mb4',
    timezone: '+00:00',
  },
  pool: { min: 2, max: 10 },
  migrations: { directory: './migrations', tableName: 'knex_migrations' },
  seeds: { directory: './seeds' },
};
module.exports = { development: base, production: base, test: base };
