const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const cfg = require('../config');
const logger = require('../logger');

const OTP_TTL_MIN = 10, MAX_ATTEMPTS = 5;

async function sendSms(phone, text) {
  if (cfg.sms.provider === 'msg91' && cfg.sms.msg91.authkey) {
    const r = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', authkey: cfg.sms.msg91.authkey },
      body: JSON.stringify({ template_id: cfg.sms.msg91.templateId, sender: cfg.sms.msg91.sender, mobiles: phone, VAR1: text.match(/\d{6}/)?.[0] }),
    });
    if (!r.ok) throw new Error('SMS provider error ' + r.status);
    return;
  }
  logger.info({ phone, text }, 'SMS (console provider)');
}

/** Normalise to 12-digit Indian E.164 without '+'. Returns null if not a valid Indian mobile. */
function normalisePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10 && /^[6-9]/.test(d)) d = '91' + d;
  if (d.length === 12 && d.startsWith('91') && /^91[6-9]/.test(d)) return d;
  return null;
}

async function issue(phone, ip, purpose = 'login') {
  // invalidate earlier live codes for this phone
  await db('otp_codes').where({ phone, purpose }).whereNull('consumed_at').update({ consumed_at: db.fn.now() });
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const code_hash = await bcrypt.hash(code, 8);
  await db('otp_codes').insert({ phone, code_hash, purpose, ip, expires_at: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000) });
  await sendSms(phone, `${code} is your Devikka one-time code. Valid ${OTP_TTL_MIN} minutes. Never share it.`);
  return cfg.sms.otpDevEcho ? code : null;
}

async function verify(phone, code, purpose = 'login') {
  const row = await db('otp_codes').where({ phone, purpose }).whereNull('consumed_at').orderBy('id', 'desc').first();
  if (!row) return { ok: false, reason: 'none' };
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  const ok = await bcrypt.compare(String(code || ''), row.code_hash);
  if (!ok) { await db('otp_codes').where({ id: row.id }).increment('attempts', 1); return { ok: false, reason: 'bad' }; }
  await db('otp_codes').where({ id: row.id }).update({ consumed_at: db.fn.now() });
  return { ok: true };
}
module.exports = { issue, verify, normalisePhone };
