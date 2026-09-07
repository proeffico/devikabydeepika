const db = require('../db');
/** Blended garment price per band from active size-band products (median of variant prices). */
async function bandPrices() {
  const rows = await db('product_variants as v').join('products as p', 'p.id', 'v.product_id').join('size_bands as b', 'b.id', 'v.size_band_id')
    .where('p.is_active', true).select('b.code', 'b.id as band_id', 'v.price');
  const by = {};
  for (const r of rows) (by[r.code] ||= { id: r.band_id, prices: [] }).prices.push(Number(r.price));
  const out = {};
  for (const [code, o] of Object.entries(by)) { const s = o.prices.sort((a, b) => a - b); out[code] = { id: o.id, price: s[Math.floor(s.length / 2)] }; }
  return out;
}
async function comboDiscount(count) {
  const rows = await db('combo_discounts').orderBy('deity_count');
  let pct = 0; for (const r of rows) if (count >= r.deity_count) pct = Number(r.discount_pct);
  return pct;
}
/** Price a dress pack: items = [{deity_id, band_code, pieces}] */
async function pricePack(items, rhythm) {
  const bp = await bandPrices();
  let subtotal = 0; const lines = [];
  for (const it of items) {
    const b = bp[it.band_code]; if (!b) { lines.push({ ...it, unit: null }); continue; }
    const unit = b.price * (it.pieces || 1); subtotal += unit; lines.push({ ...it, unit, band_id: b.id });
  }
  const pct = await comboDiscount(lines.filter((l) => l.unit).length);
  const discount = Math.round(subtotal * pct / 100);
  const perCycle = subtotal - discount;
  return { lines, subtotal, pct, discount, perCycle, perMonth: rhythm === 'quarterly' ? Math.round(perCycle / 3) : perCycle };
}
module.exports = { bandPrices, comboDiscount, pricePack };
