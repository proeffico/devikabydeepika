const strings = require('../i18n/strings');
const cfg = require('../config');

/** /hi/... → Hindi. Everything else → English. Sets res.locals for every view. */
module.exports = function locale(req, res, next) {
  const hi = req.path === '/hi' || req.path.startsWith('/hi/');
  req.locale = hi ? 'hi' : 'en';
  req.L = hi ? '/hi' : '';                       // URL prefix for links
  res.locals.locale = req.locale;
  res.locals.L = req.L;
  res.locals.t = strings[req.locale];
  res.locals.tr = (row, field) => (row ? (row[`${field}_${req.locale}`] || row[`${field}_en`] || '') : '');
  res.locals.cfg = { brand: cfg.brand, whatsapp: cfg.whatsapp, baseUrl: cfg.baseUrl, razorpayKey: cfg.razorpay.keyId };
  res.locals.money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  res.locals.path = req.path;
  res.locals.customer = req.session?.customer || null;
  res.locals.admin = req.session?.admin || null;
  res.locals.flash = req.session?.flash || null;
  if (req.session) delete req.session.flash;
  res.locals.cartCount = req.session?.cartCount || 0;
  res.locals.seo = {}; // filled by each route
  if (hi) { req.url = req.url.replace(/^\/hi(?=\/|$)/, '') || '/'; }
  next();
};
