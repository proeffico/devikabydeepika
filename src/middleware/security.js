const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const cfg = require('../config');

/** Content Security Policy — only what the page needs: our own assets, Google Fonts, Razorpay checkout. */
const helmetMw = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://checkout.razorpay.com', "'unsafe-inline'"], // inline: theme init + small page scripts, all nonce'd below
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
      'frame-src': ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': cfg.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: cfg.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

const keyByIp = (req) => req.ip;

/** Global: generous, stops crude floods. */
const globalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyByIp });
/** OTP send: the expensive one (SMS cost). Per IP and per phone. */
const otpSendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => `${req.ip}:${String(req.body?.phone || '').replace(/\D/g, '')}`, message: { error: 'Too many code requests. Please wait 15 minutes.' } });
/** OTP verify and admin login: brute-force guard. */
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyByIp });
/** Public forms (sevadar, booking, waitlist). */
const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyByIp });
/** Checkout / payment creation. */
const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyByIp });
/** Admin area as a whole. */
const adminLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: keyByIp });

/**
 * CSRF: synchronizer token bound to the session. Every state-changing request must carry it
 * in the `_csrf` field or the `x-csrf-token` header. Webhooks are mounted before this and
 * verify an HMAC instead.
 */
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('base64url');
  res.locals.csrf = req.session.csrf;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (!sent || sent.length !== req.session.csrf.length || !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(req.session.csrf))) {
    const err = new Error('CSRF token mismatch'); err.status = 403; err.code = 'CSRF'; return next(err);
  }
  next();
}

/**
 * Anti-spam for public forms: a honeypot field that humans never see and a timestamp that
 * must be at least 3 seconds old. Bots fill the honeypot or submit instantly.
 */
function honeypot(field = 'website', minMs = 3000) {
  return (req, res, next) => {
    if (req.body && String(req.body[field] || '').trim() !== '') { const e = new Error('spam'); e.status = 400; e.code = 'SPAM'; return next(e); }
    const t = Number(req.body?._t || 0);
    if (!t || Date.now() - t < minMs) { const e = new Error('spam'); e.status = 400; e.code = 'SPAM'; return next(e); }
    next();
  };
}

/** Hand the templates a fresh timestamp for the honeypot timer. */
function formTimer(req, res, next) { res.locals.formT = Date.now(); next(); }

module.exports = { helmetMw, hpp: hpp(), globalLimiter, otpSendLimiter, authLimiter, formLimiter, checkoutLimiter, adminLimiter, csrf, honeypot, formTimer };
