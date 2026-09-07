require('dotenv').config();
const bool = (v, d = false) => (v === undefined ? d : /^(1|true|yes)$/i.test(String(v)));
const cfg = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: Number(process.env.PORT || 3000),
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  sessionSecret: process.env.SESSION_SECRET || '',
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    msg91: { authkey: process.env.MSG91_AUTHKEY || '', templateId: process.env.MSG91_TEMPLATE_ID || '', sender: process.env.MSG91_SENDER || 'DVIKKA' },
    otpDevEcho: bool(process.env.OTP_DEV_ECHO, false),
  },
  whatsapp: (process.env.WHATSAPP_NUMBER || '919355110366').replace(/\D/g, ''),
  brand: 'Devikka by Deepika',
};
if (cfg.isProd) {
  const missing = [];
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 32) missing.push('SESSION_SECRET (>=32 chars)');
  if (!cfg.razorpay.keyId) missing.push('RAZORPAY_KEY_ID');
  if (!cfg.razorpay.keySecret) missing.push('RAZORPAY_KEY_SECRET');
  if (!cfg.razorpay.webhookSecret) missing.push('RAZORPAY_WEBHOOK_SECRET');
  if (!cfg.cookieSecure) missing.push('COOKIE_SECURE=true');
  if (missing.length) { console.error('Refusing to start in production without: ' + missing.join(', ')); process.exit(1); }
}
module.exports = cfg;
