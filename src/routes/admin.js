const express = require('express');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const db = require('../db');
const { z, body } = require('../lib/validate');
const { authLimiter, adminLimiter } = require('../middleware/security');
const { requireAdmin, requireRole } = require('../middleware/auth');
const audit = require('../lib/audit');
const r = express.Router();
r.use(adminLimiter);
r.use((req, res, next) => { res.locals.isAdminArea = true; res.locals.seo = { title: 'Admin', noindex: true }; next(); });

// ---------- login with lockout ----------
r.get('/admin/login', (req, res) => res.render('admin/login', { error: null }));
r.post('/admin/login', authLimiter, body(z.object({ email: z.string().trim().email().max(160), password: z.string().min(8).max(200) })), async (req, res, next) => {
  try {
    const a = await db('admins').where({ email: req.valid.email.toLowerCase(), is_active: true }).first();
    const fail = async () => {
      if (a) {
        const failed = a.failed_logins + 1;
        const patch = { failed_logins: failed };
        if (failed >= 5) { patch.locked_until = new Date(Date.now() + 15 * 60 * 1000); patch.failed_logins = 0; }
        await db('admins').where('id', a.id).update(patch);
      }
      await audit(req, 'admin.login_failed', { meta: { email: req.valid.email } });
      return res.status(401).render('admin/login', { error: 'Email or password is wrong, or the account is temporarily locked.' });
    };
    if (!a) { await bcrypt.compare(req.valid.password, '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345'); return fail(); } // constant-time-ish
    if (a.locked_until && new Date(a.locked_until) > new Date()) return fail();
    const ok = await bcrypt.compare(req.valid.password, a.password_hash);
    if (!ok) return fail();
    await db('admins').where('id', a.id).update({ failed_logins: 0, locked_until: null, last_login_at: db.fn.now() });
    await new Promise((ok2, bad) => req.session.regenerate((e) => (e ? bad(e) : ok2())));
    req.session.admin = { id: a.id, email: a.email, name: a.name, role: a.role };
    await audit(req, 'admin.login', { actor_type: 'admin', actor_id: a.id });
    res.redirect('/admin');
  } catch (e) { next(e); }
});
r.post('/admin/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));
r.use('/admin', requireAdmin);

// ---------- dashboard ----------
r.get('/admin', async (req, res) => {
  const [orders, subs, bookings, sevadars, waitlist, products, lowStock] = await Promise.all([
    db('orders').orderBy('id', 'desc').limit(10),
    db('subscriptions').count({ n: '*' }).where('status', 'active').first(),
    db('visit_bookings').where('status', 'requested').orderBy('visit_date').limit(10),
    db('sevadars').where('status', 'applied').count({ n: '*' }).first(),
    db('waitlist').select('pincode').count({ n: '*' }).groupBy('pincode').orderBy('n', 'desc').limit(8),
    db('products').count({ n: '*' }).first(),
    db('product_variants as v').join('products as p', 'p.id', 'v.product_id').join('size_bands as b', 'b.id', 'v.size_band_id').where('v.stock', '<', 3).select('p.name_en', 'b.code', 'v.stock').limit(10),
  ]);
  const estimates = await db('products').where('price_is_estimate', true).count({ n: '*' }).first();
  res.render('admin/dashboard', { orders, subs, bookings, sevadars, waitlist, products, lowStock, estimates });
});

// ---------- orders ----------
r.get('/admin/orders', async (req, res) => {
  const status = req.query.status;
  let q = db('orders').orderBy('id', 'desc').limit(200); if (status) q = q.where('status', status);
  res.render('admin/orders', { orders: await q, status });
});
r.get('/admin/orders/:id', async (req, res, next) => {
  const o = await db('orders').where('id', Number(req.params.id)).first(); if (!o) return next();
  o.items = await db('order_items').where('order_id', o.id); o.payments = await db('payments').where('order_id', o.id);
  res.render('admin/order', { o });
});
r.post('/admin/orders/:id/status', body(z.object({ status: z.enum(['paid', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled', 'refunded']) })), async (req, res, next) => {
  try {
    await db('orders').where('id', Number(req.params.id)).update({ status: req.valid.status });
    await audit(req, 'order.status', { actor_type: 'admin', actor_id: req.session.admin.id, entity: 'order', entity_id: Number(req.params.id), meta: { status: req.valid.status } });
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (e) { next(e); }
});

// ---------- products ----------
r.get('/admin/products', async (req, res) => {
  const products = await db('products as p').join('categories as c', 'c.id', 'p.category_id').select('p.*', 'c.name_en as cat').orderBy('p.id', 'desc');
  res.render('admin/products', { products });
});
r.get('/admin/products/new', async (req, res) => res.render('admin/product', { p: null, ...(await formData()) }));
r.get('/admin/products/:id', async (req, res, next) => {
  const p = await db('products').where('id', Number(req.params.id)).first(); if (!p) return next();
  p.variants = await db('product_variants').where('product_id', p.id);
  p.deityIds = (await db('product_deities').where('product_id', p.id)).map((x) => x.deity_id);
  p.festivalIds = (await db('product_festivals').where('product_id', p.id)).map((x) => x.festival_id);
  p.images = await db('product_images').where('product_id', p.id).orderBy('sort');
  res.render('admin/product', { p, ...(await formData()) });
});
async function formData() {
  const [cats, subs, deities, fests, bands] = await Promise.all([db('categories').orderBy('sort'), db('subcategories').orderBy('sort'), db('deities').orderBy('sort'), db('festivals').orderBy('sort'), db('size_bands').orderBy('sort')]);
  return { cats, subs, deities, fests, bands };
}
const productSchema = z.object({
  name_en: z.string().trim().min(2).max(160), name_hi: z.string().trim().min(1).max(160), slug: z.string().trim().max(140).optional(),
  category_id: z.coerce.number().int(), subcategory_id: z.coerce.number().int().optional(),
  description_en: z.string().max(5000).optional().default(''), description_hi: z.string().max(5000).optional().default(''),
  fabric_en: z.string().max(120).optional().default(''), fabric_hi: z.string().max(120).optional().default(''),
  sku: z.string().trim().max(40).optional().default(''), base_price: z.coerce.number().min(0).optional(), stock: z.coerce.number().int().min(0).default(0),
  price_is_estimate: z.coerce.boolean().default(false), one_of_one: z.coerce.boolean().default(false), is_featured: z.coerce.boolean().default(false), is_active: z.coerce.boolean().default(true),
  image_path: z.string().trim().max(255).optional().default(''),
  meta_title_en: z.string().max(160).optional().default(''), meta_desc_en: z.string().max(320).optional().default(''),
}).passthrough();
r.post('/admin/products/:id?', requireRole('owner', 'ops', 'content'), body(productSchema), async (req, res, next) => {
  try {
    const v = req.valid; const id = req.params.id ? Number(req.params.id) : null;
    const row = { name_en: v.name_en, name_hi: v.name_hi, slug: v.slug || slugify(v.name_en, { lower: true, strict: true }), category_id: v.category_id, subcategory_id: v.subcategory_id || null,
      description_en: v.description_en, description_hi: v.description_hi, fabric_en: v.fabric_en, fabric_hi: v.fabric_hi, sku: v.sku || null, base_price: v.base_price ?? null, stock: v.stock,
      price_is_estimate: v.price_is_estimate, one_of_one: v.one_of_one, is_featured: v.is_featured, is_active: v.is_active, meta_title_en: v.meta_title_en, meta_desc_en: v.meta_desc_en };
    let pid = id;
    if (id) await db('products').where('id', id).update(row); else [pid] = await db('products').insert(row);
    // variants: fields like variant_price_<bandId>, variant_stock_<bandId>
    const bands = await db('size_bands');
    for (const b of bands) {
      const price = req.body[`variant_price_${b.id}`]; const stock = req.body[`variant_stock_${b.id}`];
      if (price !== undefined && price !== '') {
        await db('product_variants').insert({ product_id: pid, size_band_id: b.id, price: Number(price), stock: Number(stock || 0) }).onConflict(['product_id', 'size_band_id']).merge();
      } else if (id) await db('product_variants').where({ product_id: pid, size_band_id: b.id }).del();
    }
    const dids = [].concat(req.body.deity_ids || []).map(Number).filter(Boolean);
    await db('product_deities').where('product_id', pid).del(); if (dids.length) await db('product_deities').insert(dids.map((d) => ({ product_id: pid, deity_id: d })));
    const fids = [].concat(req.body.festival_ids || []).map(Number).filter(Boolean);
    await db('product_festivals').where('product_id', pid).del(); if (fids.length) await db('product_festivals').insert(fids.map((f) => ({ product_id: pid, festival_id: f })));
    if (v.image_path) { await db('product_images').where('product_id', pid).del(); await db('product_images').insert({ product_id: pid, path: v.image_path.replace(/^\/?img\//, ''), alt_en: v.name_en, alt_hi: v.name_hi }); }
    await audit(req, id ? 'product.update' : 'product.create', { actor_type: 'admin', actor_id: req.session.admin.id, entity: 'product', entity_id: pid });
    res.redirect(`/admin/products/${pid}`);
  } catch (e) { next(e); }
});

// ---------- simple lists ----------
r.get('/admin/subscriptions', async (req, res) => {
  const subs = await db('subscriptions as s').join('customers as c', 'c.id', 's.customer_id').select('s.*', 'c.phone', 'c.name').orderBy('s.id', 'desc').limit(200);
  res.render('admin/list', { title: 'Subscriptions', rows: subs, cols: ['id', 'kind', 'rhythm', 'amount', 'status', 'next_cycle_date', 'name', 'phone'] });
});
r.get('/admin/cycles', async (req, res) => {
  const rows = await db('cycles as cy').join('subscriptions as s', 's.id', 'cy.subscription_id').join('customers as c', 'c.id', 's.customer_id').select('cy.*', 's.kind', 'c.phone', 'c.name').whereNotIn('cy.state', ['closed', 'skipped']).orderBy('cy.due_date').limit(300);
  res.render('admin/cycles', { rows });
});
r.post('/admin/cycles/:id/state', body(z.object({ state: z.enum(['pending_choice', 'chosen', 'in_production', 'ready', 'dispatched', 'delivered', 'closed', 'skipped']) })), async (req, res, next) => {
  try { await db('cycles').where('id', Number(req.params.id)).update({ state: req.valid.state }); res.redirect('/admin/cycles'); } catch (e) { next(e); }
});
r.get('/admin/bookings', async (req, res) => {
  const rows = await db('visit_bookings').orderBy('visit_date', 'desc').limit(300); const sevadars = await db('sevadars').whereIn('status', ['verified', 'active']);
  res.render('admin/bookings', { rows, sevadars });
});
r.post('/admin/bookings/:id', body(z.object({ status: z.enum(['requested', 'confirmed', 'done', 'cancelled', 'no_show']), sevadar_id: z.coerce.number().int().optional() })), async (req, res, next) => {
  try { await db('visit_bookings').where('id', Number(req.params.id)).update({ status: req.valid.status, sevadar_id: req.valid.sevadar_id || null }); res.redirect('/admin/bookings'); } catch (e) { next(e); }
});
r.get('/admin/sevadars', async (req, res) => res.render('admin/sevadars', { rows: await db('sevadars').orderBy('id', 'desc') }));
r.post('/admin/sevadars/:id', body(z.object({ status: z.enum(['applied', 'interview', 'verified', 'active', 'inactive', 'rejected']), pay_per_visit: z.coerce.number().min(0).optional() })), async (req, res, next) => {
  try { await db('sevadars').where('id', Number(req.params.id)).update({ status: req.valid.status, pay_per_visit: req.valid.pay_per_visit ?? null }); res.redirect('/admin/sevadars'); } catch (e) { next(e); }
});
r.get('/admin/customers', async (req, res) => res.render('admin/list', { title: 'Customers', rows: await db('customers').orderBy('id', 'desc').limit(300), cols: ['id', 'phone', 'name', 'locale', 'last_login_at', 'created_at'] }));
r.get('/admin/waitlist', async (req, res) => res.render('admin/list', { title: 'Waitlist by pin code', rows: await db('waitlist').select('pincode').count({ n: '*' }).groupBy('pincode').orderBy('n', 'desc'), cols: ['pincode', 'n'] }));
r.get('/admin/festivals', async (req, res) => res.render('admin/festivals', { rows: await db('festivals').orderBy('sort') }));
r.post('/admin/festivals/:id', requireRole('owner', 'ops'), body(z.object({ pack_price: z.coerce.number().min(0).optional(), next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')), pack_en: z.string().max(2000), pack_hi: z.string().max(2000) })), async (req, res, next) => {
  try { await db('festivals').where('id', Number(req.params.id)).update({ pack_price: req.valid.pack_price ?? null, next_date: req.valid.next_date || null, pack_en: req.valid.pack_en, pack_hi: req.valid.pack_hi }); res.redirect('/admin/festivals'); } catch (e) { next(e); }
});
r.get('/admin/pricing', async (req, res) => res.render('admin/pricing', { plans: await db('visit_plans').orderBy('sort'), ladder: await db('combo_discounts').orderBy('deity_count'), settings: await db('settings') }));
r.post('/admin/pricing/plans/:id', requireRole('owner'), body(z.object({ monthly_price: z.coerce.number().min(0), quarterly_price: z.coerce.number().min(0) })), async (req, res, next) => {
  try { await db('visit_plans').where('id', Number(req.params.id)).update(req.valid); await audit(req, 'pricing.visit_plan', { actor_type: 'admin', actor_id: req.session.admin.id, entity: 'visit_plan', entity_id: Number(req.params.id), meta: req.valid }); res.redirect('/admin/pricing'); } catch (e) { next(e); }
});
r.post('/admin/pricing/ladder', requireRole('owner'), async (req, res, next) => {
  try {
    for (const n of [1, 2, 3, 4]) { const v = Number(req.body[`d${n}`]); if (!isNaN(v)) await db('combo_discounts').where('deity_count', n).update({ discount_pct: Math.max(0, Math.min(60, v)), is_estimate: false }); }
    res.redirect('/admin/pricing');
  } catch (e) { next(e); }
});
r.get('/admin/audit', requireRole('owner'), async (req, res) => res.render('admin/list', { title: 'Audit log', rows: await db('audit_log').orderBy('id', 'desc').limit(300), cols: ['id', 'created_at', 'actor_type', 'actor_id', 'action', 'entity', 'entity_id', 'ip'] }));

module.exports = r;
