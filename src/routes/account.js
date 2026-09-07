const express = require('express');
const db = require('../db');
const otp = require('../lib/otp');
const { seo } = require('../lib/seo');
const { z, body, phone, pincode, name, shortText } = require('../lib/validate');
const { otpSendLimiter, authLimiter, formLimiter, honeypot } = require('../middleware/security');
const { requireCustomer } = require('../middleware/auth');
const orders = require('../services/orders');
const subs = require('../services/subscriptions');
const catalog = require('../services/catalog');
const audit = require('../lib/audit');
const r = express.Router();

// ---------- OTP login ----------
r.get('/account/login', (req, res) => {
  if (req.session.customer) return res.redirect(`${req.L}/account`);
  res.render('pages/login', { step: 'phone', seo: seo(req, { title: res.locals.t.account.login, noindex: true }) });
});
r.post('/account/otp', otpSendLimiter, honeypot('website', 1500), body(z.object({ phone })), async (req, res, next) => {
  try {
    const ph = otp.normalisePhone(req.valid.phone);
    if (!ph) return res.status(400).render('pages/login', { step: 'phone', error: res.locals.t.form.phone, seo: seo(req, { title: res.locals.t.account.login, noindex: true }) });
    const blocked = await db('customers').where({ phone: ph, is_blocked: true }).first();
    if (blocked) return res.status(403).render('pages/login', { step: 'phone', error: res.locals.t.account.tooMany, seo: seo(req, { title: res.locals.t.account.login, noindex: true }) });
    const echo = await otp.issue(ph, req.ip);
    req.session.otpPhone = ph;
    res.render('pages/login', { step: 'code', phone: ph, echo, seo: seo(req, { title: res.locals.t.account.login, noindex: true }) });
  } catch (e) { next(e); }
});
r.post('/account/verify', authLimiter, body(z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.') })), async (req, res, next) => {
  try {
    const ph = req.session.otpPhone;
    if (!ph) return res.redirect(`${req.L}/account/login`);
    const v = await otp.verify(ph, req.valid.code);
    if (!v.ok) {
      const msg = v.reason === 'locked' ? res.locals.t.account.tooMany : res.locals.t.account.otpBad;
      return res.status(400).render('pages/login', { step: 'code', phone: ph, error: msg, seo: seo(req, { title: res.locals.t.account.login, noindex: true }) });
    }
    let c = await db('customers').where('phone', ph).first();
    if (!c) { const [id] = await db('customers').insert({ phone: ph, locale: req.locale }); c = await db('customers').where('id', id).first(); }
    await db('customers').where('id', c.id).update({ last_login_at: db.fn.now() });
    // rotate the session id on privilege change
    const returnTo = req.session.returnTo; const cartCount = req.session.cartCount; const oldSid = req.sessionID;
    await new Promise((ok, bad) => req.session.regenerate((e) => (e ? bad(e) : ok())));
    await db('carts').where('session_id', oldSid).update({ session_id: req.sessionID, customer_id: c.id }).catch(() => {});
    req.session.customer = { id: c.id, phone: c.phone, name: c.name };
    req.session.cartCount = cartCount;
    await audit(req, 'customer.login', { actor_type: 'customer', actor_id: c.id });
    res.redirect(returnTo || `${req.L}/account`);
  } catch (e) { next(e); }
});
r.post('/account/logout', (req, res) => { req.session.destroy(() => res.redirect(`${req.L}/`)); });

// ---------- dashboard ----------
r.get('/account', requireCustomer, async (req, res) => {
  const cid = req.session.customer.id;
  const [c, h, os, ss, deities, bands, addrs] = await Promise.all([
    db('customers').where('id', cid).first(),
    db('households').where('customer_id', cid).first(),
    orders.forCustomer(cid), subs.forCustomer(cid), catalog.deities(), catalog.sizeBands(),
    db('addresses').where('customer_id', cid).orderBy('is_default', 'desc'),
  ]);
  const idols = h ? await db('idols as i').join('deities as d', 'd.id', 'i.deity_id').leftJoin('size_bands as b', 'b.id', 'i.size_band_id').where('i.household_id', h.id).select('i.*', 'd.name_en', 'd.name_hi', 'b.code') : [];
  res.render('pages/account', { c, h, idols, os, ss, deities, bands, addrs, seo: seo(req, { title: res.locals.t.account.h1, noindex: true }) });
});
r.post('/account/profile', requireCustomer, body(z.object({ name, footprint: z.enum(['3x3', '5x5', '5x8', '6x10', '']).optional(), dressing_pref: z.enum(['family', 'sevadar']).default('family') })), async (req, res, next) => {
  try {
    const cid = req.session.customer.id;
    await db('customers').where('id', cid).update({ name: req.valid.name });
    req.session.customer.name = req.valid.name;
    let h = await db('households').where('customer_id', cid).first();
    const patch = { footprint: req.valid.footprint || null, dressing_pref: req.valid.dressing_pref };
    if (h) await db('households').where('id', h.id).update(patch); else await db('households').insert({ customer_id: cid, ...patch });
    req.session.flash = { ok: true, msg: res.locals.t.account.saved };
    res.redirect(`${req.L}/account`);
  } catch (e) { next(e); }
});
r.post('/account/idols', requireCustomer, body(z.object({ deity_id: z.coerce.number().int().positive(), height_in: z.coerce.number().min(1).max(120).optional(), size_number: shortText(10), notes: shortText(255) })), async (req, res, next) => {
  try {
    const cid = req.session.customer.id;
    let h = await db('households').where('customer_id', cid).first();
    if (!h) { const [id] = await db('households').insert({ customer_id: cid }); h = { id }; }
    let band = null;
    if (req.valid.height_in) band = await db('size_bands').where('min_in', '<=', req.valid.height_in).andWhere((w) => w.whereNull('max_in').orWhere('max_in', '>=', req.valid.height_in)).orderBy('sort').first();
    await db('idols').insert({ household_id: h.id, deity_id: req.valid.deity_id, height_in: req.valid.height_in || null, size_band_id: band?.id || null, size_number: req.valid.size_number || null, notes: req.valid.notes || null });
    res.redirect(`${req.L}/account#idols`);
  } catch (e) { next(e); }
});
r.post('/account/idols/:id/delete', requireCustomer, async (req, res, next) => {
  try {
    const h = await db('households').where('customer_id', req.session.customer.id).first();
    if (h) await db('idols').where({ id: Number(req.params.id), household_id: h.id }).del();
    res.redirect(`${req.L}/account#idols`);
  } catch (e) { next(e); }
});
r.post('/account/subscriptions/:id/:action', requireCustomer, async (req, res, next) => {
  try {
    const map = { pause: 'paused', resume: 'active', cancel: 'cancelled' };
    const status = map[req.params.action]; if (!status) return res.redirect(`${req.L}/account`);
    await subs.setStatus(Number(req.params.id), req.session.customer.id, status);
    await audit(req, `subscription.${req.params.action}`, { actor_type: 'customer', actor_id: req.session.customer.id, entity: 'subscription', entity_id: Number(req.params.id) });
    res.redirect(`${req.L}/account#subs`);
  } catch (e) { next(e); }
});

// ---------- sevadar signup, booking, waitlist ----------
r.get('/sevadar', (req, res) => res.render('pages/sevadar', { seo: seo(req, { title: res.locals.t.sevadar.h, description: res.locals.t.sevadar.p, path: '/sevadar' }) }));
r.post('/sevadar', formLimiter, honeypot(), body(z.object({ name, phone, area: z.string().trim().min(2).max(120), has_experience: z.enum(['yes', 'no']).default('no'), note: shortText(1000) })), async (req, res, next) => {
  try {
    const ph = otp.normalisePhone(req.valid.phone);
    if (!ph) return res.status(400).render('pages/sevadar', { error: res.locals.t.form.phone, seo: seo(req, { title: res.locals.t.sevadar.h }) });
    await db('sevadars').insert({ name: req.valid.name, phone: ph, area: req.valid.area, has_experience: req.valid.has_experience === 'yes', note: req.valid.note || null, ip: req.ip }).onConflict('phone').merge(['name', 'area', 'note']);
    res.render('pages/sevadar', { done: true, seo: seo(req, { title: res.locals.t.sevadar.h }) });
  } catch (e) { next(e); }
});

r.get('/book', async (req, res) => {
  const plans = await catalog.visitPlans();
  res.render('pages/book', { plans, seo: seo(req, { title: res.locals.t.book.h2, description: res.locals.t.book.lede, path: '/book' }) });
});
const bookSchema = z.object({ name, phone, pincode, kind: z.enum(['first_visit', 'plan_visit', 'festival', 'styling']), footprint: z.enum(['3x3', '5x5', '5x8', '6x10', '']).optional(), visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slot: z.enum(['08-10', '10-12', '12-14', '16-18', '18-20']), dressing_pref: z.enum(['family', 'sevadar']).default('family'), idols_note: shortText(255) });
r.post('/book', formLimiter, honeypot(), body(bookSchema), async (req, res, next) => {
  try {
    const v = req.valid; const plans = await catalog.visitPlans();
    const ph = otp.normalisePhone(v.phone);
    const err = (m) => res.status(400).render('pages/book', { plans, error: m, old: v, seo: seo(req, { title: res.locals.t.book.h2 }) });
    if (!ph) return err(res.locals.t.form.phone);
    const d = new Date(v.visit_date + 'T00:00:00'); const today = new Date(); today.setHours(0, 0, 0, 0);
    if (isNaN(d) || d < today) return err(res.locals.t.form.date);
    const sector = await db('sectors').where({ pincode: v.pincode, is_live: true }).first();
    if (!sector) {
      await db('waitlist').insert({ phone: ph, pincode: v.pincode, note: v.kind, ip: req.ip }).onConflict(['phone', 'pincode']).ignore();
      return res.render('pages/book', { plans, waitlisted: v.pincode, seo: seo(req, { title: res.locals.t.book.h2 }) });
    }
    // capacity: bookings in that slot on that day for this sector vs sevadars available
    const [{ n }] = await db('visit_bookings').where({ sector_id: sector.id, visit_date: v.visit_date, slot: v.slot }).whereNotIn('status', ['cancelled']).count({ n: '*' });
    const perSlot = Math.max(1, Math.ceil(sector.visit_capacity_per_day / 5));
    if (Number(n) >= perSlot) return err(res.locals.t.book.full);
    await db('visit_bookings').insert({ customer_id: req.session.customer?.id || null, sector_id: sector.id, kind: v.kind, name: v.name, phone: ph, pincode: v.pincode, footprint: v.footprint || null, visit_date: v.visit_date, slot: v.slot, dressing_pref: v.dressing_pref, idols_note: v.idols_note || null, ip: req.ip });
    res.render('pages/book', { plans, done: true, seo: seo(req, { title: res.locals.t.book.h2 }) });
  } catch (e) { next(e); }
});
r.post('/waitlist', formLimiter, honeypot('website', 1000), body(z.object({ phone, pincode })), async (req, res, next) => {
  try {
    const ph = otp.normalisePhone(req.valid.phone); if (!ph) return res.status(400).json({ error: res.locals.t.form.phone });
    await db('waitlist').insert({ phone: ph, pincode: req.valid.pincode, ip: req.ip }).onConflict(['phone', 'pincode']).ignore();
    res.json({ ok: true });
  } catch (e) { next(e); }
});
module.exports = r;
