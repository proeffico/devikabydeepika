function requireCustomer(req, res, next) {
  if (req.session?.customer) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect(`${req.L}/account/login`);
}
function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  return res.redirect('/admin/login');
}
function requireRole(...roles) {
  return (req, res, next) => (req.session?.admin && roles.includes(req.session.admin.role)) ? next() : res.status(403).render('admin/denied');
}
module.exports = { requireCustomer, requireAdmin, requireRole };
