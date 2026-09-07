/* Creates or resets the owner admin from ADMIN_EMAIL / ADMIN_PASSWORD in .env */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
(async () => {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase(), pw = process.env.ADMIN_PASSWORD || '';
  if (!email || pw.length < 10) { console.error('Set ADMIN_EMAIL and a >=10 char ADMIN_PASSWORD in .env'); process.exit(1); }
  const hash = await bcrypt.hash(pw, 12);
  const a = await db('admins').where('email', email).first();
  if (a) await db('admins').where('id', a.id).update({ password_hash: hash, is_active: true, failed_logins: 0, locked_until: null });
  else await db('admins').insert({ email, name: 'Owner', password_hash: hash, role: 'owner' });
  console.log(`Admin ready: ${email}`); await db.destroy();
})();
