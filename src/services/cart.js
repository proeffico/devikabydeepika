const db = require('../db');
const catalog = require('./catalog');

async function getCart(req, create = false) {
  let cart = await db('carts').where('session_id', req.sessionID).first();
  if (!cart && create) {
    const [id] = await db('carts').insert({ session_id: req.sessionID, customer_id: req.session.customer?.id || null });
    cart = await db('carts').where('id', id).first();
  }
  return cart;
}

async function items(req) {
  const cart = await getCart(req);
  if (!cart) return [];
  const rows = await db('cart_items as ci').join('products as p', 'p.id', 'ci.product_id')
    .leftJoin('product_variants as v', 'v.id', 'ci.variant_id').leftJoin('size_bands as b', 'b.id', 'v.size_band_id')
    .leftJoin('deities as d', 'd.id', 'ci.deity_id').where('ci.cart_id', cart.id)
    .select('ci.id as item_id', 'ci.qty', 'ci.variant_id', 'ci.deity_id', 'p.*', 'v.price as variant_price', 'v.stock as variant_stock',
      'b.code as band_code', 'b.label_en as band_en', 'b.label_hi as band_hi', 'd.name_en as deity_en', 'd.name_hi as deity_hi', 'd.slug as deity_slug');
  await catalog.decorate(rows);
  for (const r of rows) {
    r.unit = r.variant_id ? Number(r.variant_price) : Number(r.base_price || 0);
    r.line = r.unit * r.qty;
    r.available = r.variant_id ? r.variant_stock : r.stock;
  }
  return rows;
}

async function totals(req) {
  const rows = await items(req);
  const s = await catalog.settings();
  const subtotal = rows.reduce((a, r) => a + r.line, 0);
  const freeOver = Number(s.free_shipping_over || 0), flat = Number(s.shipping_flat || 0);
  const shipping = rows.length === 0 || subtotal >= freeOver ? 0 : flat;
  return { rows, subtotal, shipping, total: subtotal + shipping, freeOver, count: rows.reduce((a, r) => a + r.qty, 0) };
}

async function add(req, { product_id, variant_id = null, deity_id = null, qty = 1 }) {
  const cart = await getCart(req, true);
  const p = await db('products').where({ id: product_id, is_active: true }).first();
  if (!p) throw Object.assign(new Error('Product not found'), { status: 404 });
  if (variant_id) {
    const v = await db('product_variants').where({ id: variant_id, product_id }).first();
    if (!v) throw Object.assign(new Error('Size not available'), { status: 400 });
  }
  const existing = await db('cart_items').where({ cart_id: cart.id, product_id, variant_id, deity_id }).first();
  if (existing) await db('cart_items').where('id', existing.id).update({ qty: Math.min(10, existing.qty + qty) });
  else await db('cart_items').insert({ cart_id: cart.id, product_id, variant_id, deity_id, qty: Math.min(10, qty) });
  await refreshCount(req);
}
async function setQty(req, item_id, qty) {
  const cart = await getCart(req); if (!cart) return;
  if (qty <= 0) await db('cart_items').where({ id: item_id, cart_id: cart.id }).del();
  else await db('cart_items').where({ id: item_id, cart_id: cart.id }).update({ qty: Math.min(10, qty) });
  await refreshCount(req);
}
async function clear(req) {
  const cart = await getCart(req); if (!cart) return;
  await db('cart_items').where('cart_id', cart.id).del();
  await refreshCount(req);
}
async function refreshCount(req) {
  const t = await totals(req); req.session.cartCount = t.count;
}
module.exports = { getCart, items, totals, add, setQty, clear, refreshCount };
