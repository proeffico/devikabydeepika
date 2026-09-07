const express = require('express');
const db = require('../db');
const cart = require('../services/cart');
const orders = require('../services/orders');
const subs = require('../services/subscriptions');
const catalog = require('../services/catalog');
const { seo } = require('../lib/seo');
const { verifyPaymentSignature, verifySubscriptionSignature } = require('../lib/razorpay');
const { z, body, phone, pincode, name, shortText } = require('../lib/validate');
const { checkoutLimiter } = require('../middleware/security');
const { requireCustomer } = require('../middleware/auth');
const audit = require('../lib/audit');
const r = express.Router();

// ---------- cart ----------
r.get('/cart', async (req, res) => {
  const t = await cart.totals(req);
  res.render('pages/cart', { ...t, seo: seo(req, { title: res.locals.t.cart.h1, noindex: true }) });
});
r.post('/cart/add', body(z.object({ product_id: z.coerce.number().int().positive(), variant_id: z.coerce.number().int().positive().optional(), deity_id: z.coerce.number().int().positive().optional(), qty: z.coerce.number().int().min(1).max(10).default(1) })), async (req, res, next) => {
  try { await cart.add(req, req.valid); req.session.flash = { ok: true, msg: 'added' }; res.redirect(`${req.L}/cart`); } catch (e) { next(e); }
});
r.post('/cart/update', body(z.object({ item_id: z.coerce.number().int().positive(), qty: z.coerce.number().int().min(0).max(10) })), async (req, res, next) => {
  try { await cart.setQty(req, req.valid.item_id, req.valid.qty); res.redirect(`${req.L}/cart`); } catch (e) { next(e); }
});

// ---------- checkout ----------
const shipSchema = z.object({ name, phone, line1: z.string().trim().min(4).max(200), line2: shortText(200), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), pincode, notes: shortText(500) });

r.get('/checkout', async (req, res) => {
  const t = await cart.totals(req);
  if (!t.rows.length) return res.redirect(`${req.L}/cart`);
  const addr = req.session.customer ? await db('addresses').where({ customer_id: req.session.customer.id }).orderBy('is_default', 'desc').first() : null;
  res.render('pages/checkout', { ...t, addr, seo: seo(req, { title: res.locals.t.checkout.h1, noindex: true }) });
});

/** Step 1: create our order + Razorpay order, hand the key and ids to the page's Razorpay Checkout. */
r.post('/checkout/create', checkoutLimiter, body(shipSchema), async (req, res, next) => {
  try {
    const { order, rzOrder } = await orders.createFromCart(req, req.valid, req.locale);
    if (req.session.customer) {
      const exists = await db('addresses').where({ customer_id: req.session.customer.id, pincode: req.valid.pincode, line1: req.valid.line1 }).first();
      if (!exists) await db('addresses').insert({ customer_id: req.session.customer.id, name: req.valid.name, phone: req.valid.phone.replace(/\D/g, '').slice(-10), line1: req.valid.line1, line2: req.valid.line2 || null, city: req.valid.city, state: req.valid.state, pincode: req.valid.pincode, is_default: true });
    }
    req.session.pendingOrder = order.id;
    await audit(req, 'order.create', { actor_type: req.session.customer ? 'customer' : 'guest', actor_id: req.session.customer?.id, entity: 'order', entity_id: order.id });
    res.json({ order_id: order.id, order_no: order.order_no, rz_order_id: rzOrder.id, amount: rzOrder.amount, currency: 'INR', name: req.valid.name, phone: req.valid.phone });
  } catch (e) { next(e); }
});

/** Step 2: browser posts the Razorpay response; we verify the HMAC before trusting it. */
r.post('/checkout/verify', checkoutLimiter, body(z.object({ order_id: z.coerce.number().int(), razorpay_order_id: z.string().max(64), razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(200) })), async (req, res, next) => {
  try {
    const v = req.valid;
    const o = await db('orders').where({ id: v.order_id, razorpay_order_id: v.razorpay_order_id }).first();
    if (!o || o.id !== req.session.pendingOrder) return res.status(400).json({ error: 'Unknown order' });
    if (!verifyPaymentSignature({ order_id: v.razorpay_order_id, payment_id: v.razorpay_payment_id, signature: v.razorpay_signature })) {
      await audit(req, 'payment.bad_signature', { entity: 'order', entity_id: o.id });
      return res.status(400).json({ error: 'Signature mismatch' });
    }
    await orders.markPaid(o.id, { payment_id: v.razorpay_payment_id }, req);
    delete req.session.pendingOrder;
    req.session.lastOrder = o.id;
    res.json({ ok: true, redirect: `${req.L}/checkout/done` });
  } catch (e) { next(e); }
});
r.get('/checkout/done', async (req, res) => {
  const o = req.session.lastOrder ? await orders.withItems(req.session.lastOrder) : null;
  res.render('pages/order-done', { o, seo: seo(req, { title: res.locals.t.checkout.placed, noindex: true }) });
});

// ---------- subscriptions ----------
const packSchema = z.object({ rhythm: z.enum(['monthly', 'quarterly']), items: z.array(z.object({ deity_id: z.coerce.number().int().positive(), band_code: z.enum(['S1', 'S2', 'S3', 'S4']) })).min(1).max(12) });
r.post('/subscribe/dress-pack', checkoutLimiter, requireCustomerJson, express.json(), body(packSchema), async (req, res, next) => {
  try {
    const out = await subs.createDressPack(req.session.customer, req.valid.items, req.valid.rhythm);
    req.session.pendingSub = out.rzSubId;
    await audit(req, 'subscription.create', { actor_type: 'customer', actor_id: req.session.customer.id, entity: 'subscription', entity_id: out.id, meta: { kind: 'dress_pack' } });
    res.json({ subscription_id: out.rzSubId, amount: out.priced.perCycle, name: req.session.customer.name, phone: req.session.customer.phone });
  } catch (e) { next(e); }
});
r.post('/subscribe/visit', checkoutLimiter, requireCustomerJson, express.json(), body(z.object({ footprint: z.enum(['3x3', '5x5', '5x8', '6x10']), rhythm: z.enum(['monthly', 'quarterly']), pincode })), async (req, res, next) => {
  try {
    const out = await subs.createVisitPlan(req.session.customer, req.valid.footprint, req.valid.rhythm, req.valid.pincode);
    req.session.pendingSub = out.rzSubId;
    await audit(req, 'subscription.create', { actor_type: 'customer', actor_id: req.session.customer.id, entity: 'subscription', entity_id: out.id, meta: { kind: 'visit' } });
    res.json({ subscription_id: out.rzSubId, amount: out.amount, name: req.session.customer.name, phone: req.session.customer.phone });
  } catch (e) { next(e); }
});
r.post('/subscribe/verify', checkoutLimiter, requireCustomerJson, express.json(), body(z.object({ razorpay_subscription_id: z.string().max(64), razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(200) })), async (req, res, next) => {
  try {
    const v = req.valid;
    if (v.razorpay_subscription_id !== req.session.pendingSub) return res.status(400).json({ error: 'Unknown subscription' });
    if (!verifySubscriptionSignature({ subscription_id: v.razorpay_subscription_id, payment_id: v.razorpay_payment_id, signature: v.razorpay_signature })) return res.status(400).json({ error: 'Signature mismatch' });
    await subs.activate(v.razorpay_subscription_id, v.razorpay_payment_id);
    delete req.session.pendingSub;
    res.json({ ok: true, redirect: `${req.L}/account` });
  } catch (e) { next(e); }
});
function requireCustomerJson(req, res, next) { if (req.session.customer) return next(); res.status(401).json({ error: 'login', redirect: `${req.L}/account/login` }); }

// ---------- the fabric-choice link (from WhatsApp) ----------
r.get('/choose/:token', async (req, res, next) => {
  const c = await db('cycles').where('choice_token', req.params.token).first();
  if (!c) return next();
  const s = await db('subscriptions').where('id', c.subscription_id).first();
  const items = await db('subscription_items as si').join('deities as d', 'd.id', 'si.deity_id').join('size_bands as b', 'b.id', 'si.size_band_id').where('si.subscription_id', s.id).select('si.*', 'd.name_en', 'd.name_hi', 'd.slug', 'b.code');
  const prev = await db('cycle_choices as cc').join('cycles as cy', 'cy.id', 'cc.cycle_id').where('cy.subscription_id', s.id).whereNot('cy.id', c.id).select('cc.product_id', 'cc.subscription_item_id');
  for (const it of items) {
    it.options = await catalog.listProducts({ deity: it.slug, limit: 12 });
    it.options = it.options.filter((p) => p.variants.length);
    it.lastIds = prev.filter((p) => p.subscription_item_id === it.id).map((p) => p.product_id);
  }
  res.render('pages/choose', { c, s, items, done: c.state !== 'pending_choice', seo: seo(req, { title: res.locals.t.choice.h1, noindex: true }) });
});
r.post('/choose/:token', async (req, res, next) => {
  try {
    const c = await db('cycles').where({ choice_token: req.params.token, state: 'pending_choice' }).first();
    if (!c) return res.status(410).render('pages/error', { code: 410, message: res.locals.t.choice.expired, seo: { title: '410' } });
    const items = await db('subscription_items').where('subscription_id', c.subscription_id);
    const rows = [];
    for (const it of items) { const pid = Number(req.body[`item_${it.id}`]); if (pid) rows.push({ cycle_id: c.id, subscription_item_id: it.id, product_id: pid }); }
    if (rows.length) await db('cycle_choices').insert(rows);
    await db('cycles').where('id', c.id).update({ state: 'chosen', choice_made_at: db.fn.now() });
    req.session.flash = { ok: true, msg: res.locals.t.choice.done };
    res.redirect(`${req.L}/choose/${req.params.token}`);
  } catch (e) { next(e); }
});

module.exports = r;
