const logger = require('../logger');
function notFound(req, res) {
  res.status(404).render('pages/error', { code: 404, message: res.locals.t?.misc?.notFound || 'Not found', seo: { title: '404' } });
}
function handler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) logger.error({ err, url: req.originalUrl }, 'unhandled');
  const t = res.locals.t || {};
  let message = t.misc?.error || 'Something went wrong.';
  if (err.code === 'CSRF') message = t.form?.csrf || 'Session expired.';
  if (err.code === 'SPAM') message = t.form?.spam || 'Rejected.';
  if (err.code === 'VALIDATION') message = err.message;
  if (req.accepts(['html', 'json']) === 'json' || req.xhr) return res.status(status).json({ error: message, details: err.details });
  res.status(status).render('pages/error', { code: status, message, seo: { title: String(status) } });
}
module.exports = { notFound, handler };
