const db = require('../db');
const cart = require('./cart');
const { rzp } = require('../lib/razorpay');

async function nextOrderNo(trx) {
  const y = new Date().getFullYear();
  const row = await trx('orders').where('order_no', 'like', `DVK-${y}-%`).orderBy('id', 'desc').first();
  const n = row ? Number(row.order_no.split('-')[2]) + 1 : 1;
  return `DVK-${y}-${String(n).padStart(6, '0')}`;
}

/** Create a pending order from the cart and a Razorpay order for it. Stock is checked, not yet decremented. */
async function createFromCart(req, ship, locale) {
  const t = await cart.totals(req);
  if (!t.rows.length) throw Object.assign(new Error('Cart is empty'), { status: 400 });
  for (const r of t.rows) if (r.available < r.qty) throw Object.assign(new Error(`Only ${r.available} left of ${r.name_en}`), { status: 400, code: 'VALIDATION' });

  const order = await db.transaction(async (trx) => {
    const order_no = await nextOrderNo(trx);
    const [id] = await trx('orders').insert({
      order_no, customer_id: req.session.customer?.id || null, locale,
      ship_name: ship.name, ship_phone: ship.phone, ship_line1: ship.line1, ship_line2: ship.line2 || null, ship_city: ship.city, ship_state: ship.state, ship_pincode: ship.pincode,
      subtotal: t.subtotal, shipping: t.shipping, total: t.total, notes: ship.notes || null, ip: req.ip,
    });
    await trx('order_items').insert(t.rows.map((r) => ({
      order_id: id, product_id: r.id, variant_id: r.variant_id, deity_id: r.deity_id,
      name_snapshot: r.name_en + (r.deity_en ? ` — ${r.deity_en}` : ''), band_snapshot: r.band_code ? `${r.band_code} ${r.band_en}` : null,
      unit_price: r.unit, qty: r.qty, line_total: r.line,
    })));
    return trx('orders').where('id', id).first();
  });

  // Razorpay order (amount in paise). receipt = our order number for reconciliation.
  const rzOrder = await rzp().orders.create({ amount: Math.round(Number(order.total) * 100), currency: 'INR', receipt: order.order_no, notes: { order_no: order.order_no } });
  await db('orders').where('id', order.id).update({ razorpay_order_id: rzOrder.id });
  await db('payments').insert({ order_id: order.id, provider_order_id: rzOrder.id, amount: order.total, status: 'created' });
  return { order, rzOrder };
}

/** Mark paid (idempotent), decrement stock, clear the cart. Called from the verified callback and from the webhook. */
async function markPaid(orderId, { payment_id, method, raw }, req = null) {
  await db.transaction(async (trx) => {
    const o = await trx('orders').where('id', orderId).forUpdate().first();
    if (!o || o.status !== 'pending_payment') return;
    await trx('orders').where('id', orderId).update({ status: 'paid', paid_at: trx.fn.now() });
    await trx('payments').where({ order_id: orderId }).update({ provider_payment_id: payment_id, status: 'captured', method: method || null, raw: raw ? JSON.stringify(raw) : null });
    const items = await trx('order_items').where('order_id', orderId);
    for (const it of items) {
      if (it.variant_id) await trx('product_variants').where('id', it.variant_id).decrement('stock', it.qty);
      else if (it.product_id) await trx('products').where('id', it.product_id).decrement('stock', it.qty);
    }
  });
  if (req) await cart.clear(req);
}

async function forCustomer(customer_id) {
  return db('orders').where({ customer_id }).orderBy('id', 'desc');
}
async function withItems(id) {
  const o = await db('orders').where('id', id).first(); if (!o) return null;
  o.items = await db('order_items').where('order_id', id);
  return o;
}
module.exports = { createFromCart, markPaid, forCustomer, withItems };
