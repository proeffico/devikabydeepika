const crypto = require('crypto');
const db = require('../db');
const { rzp } = require('../lib/razorpay');
const pricing = require('../lib/pricing');
const cfg = require('../config');

const PERIOD = { monthly: { period: 'monthly', interval: 1 }, quarterly: { period: 'monthly', interval: 3 } };

/** Get or create a Razorpay plan for an arbitrary per-cycle amount (dress packs vary per household). */
async function planFor(amountInr, rhythm, label) {
  const key = `rzp_plan_${rhythm}_${Math.round(amountInr)}`;
  const cached = await db('settings').where('key', key).first();
  if (cached) return cached.value;
  const p = await rzp().plans.create({ ...PERIOD[rhythm], item: { name: label, amount: Math.round(amountInr * 100), currency: 'INR' } });
  await db('settings').insert({ key, value: p.id });
  return p.id;
}

async function ensureHousehold(customer_id) {
  let h = await db('households').where({ customer_id }).first();
  if (!h) { const [id] = await db('households').insert({ customer_id }); h = await db('households').where('id', id).first(); }
  return h;
}

/** Dress pack: items = [{deity_id, band_code}] → pending subscription + Razorpay subscription for checkout. */
async function createDressPack(customer, items, rhythm) {
  const deities = await db('deities').whereIn('id', items.map((i) => i.deity_id));
  const priced = await pricing.pricePack(items.map((i) => ({ ...i, pieces: deities.find((d) => d.id === i.deity_id)?.pieces_per_set || 1 })), rhythm);
  if (!priced.perCycle) throw Object.assign(new Error('Nothing priceable in this pack'), { status: 400, code: 'VALIDATION' });
  const h = await ensureHousehold(customer.id);
  const planId = await planFor(priced.perCycle, rhythm, `Devikka dress pack (${rhythm})`);
  const sub = await rzp().subscriptions.create({ plan_id: planId, total_count: rhythm === 'quarterly' ? 12 : 36, customer_notify: 1, notes: { customer_id: String(customer.id), kind: 'dress_pack' } });
  const [id] = await db('subscriptions').insert({ customer_id: customer.id, household_id: h.id, kind: 'dress_pack', rhythm, amount: priced.perCycle, razorpay_subscription_id: sub.id, razorpay_plan_id: planId });
  await db('subscription_items').insert(priced.lines.filter((l) => l.unit).map((l) => ({ subscription_id: id, deity_id: l.deity_id, size_band_id: l.band_id, unit_price: l.unit })));
  await db('subscriptions').where('id', id).update({}); // touch
  await db('subscriptions').where('id', id);
  return { id, rzSubId: sub.id, priced };
}

/** Visit plan: footprint + rhythm. Only inside a live sector. */
async function createVisitPlan(customer, footprint, rhythm, pincode) {
  const sector = await db('sectors').where({ pincode, is_live: true }).first();
  if (!sector) throw Object.assign(new Error('Visits are not yet available for this pin code'), { status: 400, code: 'VALIDATION' });
  const vp = await db('visit_plans').where('footprint', footprint).first();
  if (!vp) throw Object.assign(new Error('Unknown plan'), { status: 400 });
  const amount = rhythm === 'quarterly' ? Number(vp.quarterly_price) : Number(vp.monthly_price);
  const h = await ensureHousehold(customer.id);
  await db('households').where('id', h.id).update({ footprint });
  const planId = (rhythm === 'quarterly' ? vp.razorpay_plan_quarterly : vp.razorpay_plan_monthly) || await planFor(amount, rhythm, `Devikka visit plan ${vp.label_en} (${rhythm})`);
  const sub = await rzp().subscriptions.create({ plan_id: planId, total_count: rhythm === 'quarterly' ? 12 : 36, customer_notify: 1, notes: { customer_id: String(customer.id), kind: 'visit' } });
  const [id] = await db('subscriptions').insert({ customer_id: customer.id, household_id: h.id, kind: 'visit', rhythm, visit_plan_id: vp.id, amount, razorpay_subscription_id: sub.id, razorpay_plan_id: planId });
  return { id, rzSubId: sub.id, amount };
}

/** Called after a verified first charge or from the webhook. Activates and opens cycle 1. */
async function activate(rzSubId, paymentId = null) {
  const s = await db('subscriptions').where('razorpay_subscription_id', rzSubId).first();
  if (!s) return null;
  if (s.status === 'pending' || s.status === 'past_due') {
    const next = new Date(); next.setDate(next.getDate() + 21);
    await db('subscriptions').where('id', s.id).update({ status: 'active', activated_at: db.fn.now(), next_cycle_date: next.toISOString().slice(0, 10) });
    await openCycle(s.id, 1, next);
    if (paymentId) await db('payments').insert({ subscription_id: s.id, provider_payment_id: paymentId, amount: s.amount, status: 'captured' });
  }
  return s;
}
async function openCycle(subscription_id, cycle_no, due) {
  const exists = await db('cycles').where({ subscription_id, cycle_no }).first();
  if (exists) return exists;
  const token = crypto.randomBytes(24).toString('base64url');
  const [id] = await db('cycles').insert({ subscription_id, cycle_no, due_date: due.toISOString().slice(0, 10), choice_token: token, choice_sent_at: db.fn.now() });
  return db('cycles').where('id', id).first();
}
/** Recurring charge from webhook → next cycle. */
async function charged(rzSubId, paymentId, amountPaise) {
  const s = await db('subscriptions').where('razorpay_subscription_id', rzSubId).first();
  if (!s) return;
  const last = await db('cycles').where('subscription_id', s.id).orderBy('cycle_no', 'desc').first();
  const n = last ? last.cycle_no + 1 : 1;
  const due = new Date(); due.setDate(due.getDate() + 21);
  await openCycle(s.id, n, due);
  await db('subscriptions').where('id', s.id).update({ status: 'active', next_cycle_date: due.toISOString().slice(0, 10) });
  await db('payments').insert({ subscription_id: s.id, provider_payment_id: paymentId, amount: amountPaise / 100, status: 'captured' }).onConflict('provider_payment_id').ignore();
}
async function setStatus(id, customer_id, status) {
  const s = await db('subscriptions').where({ id, customer_id }).first(); if (!s) return null;
  const rz = rzp();
  try {
    if (status === 'paused') await rz.subscriptions.pause(s.razorpay_subscription_id, { pause_at: 'now' });
    if (status === 'active') await rz.subscriptions.resume(s.razorpay_subscription_id, { resume_at: 'now' });
    if (status === 'cancelled') await rz.subscriptions.cancel(s.razorpay_subscription_id, { cancel_at_cycle_end: 1 });
  } catch (e) { /* surface but do not block local state in dev */ if (cfg.isProd) throw e; }
  await db('subscriptions').where('id', id).update({ status, cancelled_at: status === 'cancelled' ? db.fn.now() : null });
  return s;
}
async function forCustomer(customer_id) {
  const subs = await db('subscriptions').where({ customer_id }).orderBy('id', 'desc');
  for (const s of subs) {
    s.items = await db('subscription_items as si').join('deities as d', 'd.id', 'si.deity_id').join('size_bands as b', 'b.id', 'si.size_band_id').where('si.subscription_id', s.id).select('si.*', 'd.name_en', 'd.name_hi', 'b.code');
    s.plan = s.visit_plan_id ? await db('visit_plans').where('id', s.visit_plan_id).first() : null;
    s.cycle = await db('cycles').where('subscription_id', s.id).orderBy('cycle_no', 'desc').first();
  }
  return subs;
}
module.exports = { createDressPack, createVisitPlan, activate, charged, setStatus, forCustomer, openCycle };
