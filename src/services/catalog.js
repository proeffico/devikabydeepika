const db = require('../db');

const IMG = (p) => `/img/${p}`;

async function categories() { return db('categories').where('is_active', true).orderBy('sort'); }
async function deities() { return db('deities').where('is_active', true).orderBy('sort'); }
async function festivals() { return db('festivals').where('is_active', true).orderBy('sort'); }
async function sizeBands() { return db('size_bands').orderBy('sort'); }
async function subcategories(categoryId) { return db('subcategories').where({ category_id: categoryId, is_active: true }).orderBy('sort'); }
async function settings() { const rows = await db('settings'); return Object.fromEntries(rows.map((r) => [r.key, r.value])); }

/** Attach first image, price-from, deity list and stock summary to a list of products. */
async function decorate(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const [imgs, vars, pds, bands] = await Promise.all([
    db('product_images').whereIn('product_id', ids).orderBy('sort'),
    db('product_variants').whereIn('product_id', ids),
    db('product_deities as pd').join('deities as d', 'd.id', 'pd.deity_id').whereIn('pd.product_id', ids).select('pd.product_id', 'd.*'),
    sizeBands(),
  ]);
  const bandById = Object.fromEntries(bands.map((b) => [b.id, b]));
  for (const p of products) {
    p.image = imgs.find((i) => i.product_id === p.id);
    p.imageUrl = p.image ? IMG(p.image.path) : '/img/hero-shrine-dressed.jpg';
    p.variants = vars.filter((v) => v.product_id === p.id).map((v) => ({ ...v, band: bandById[v.size_band_id] })).sort((a, b) => a.band.sort - b.band.sort);
    p.deities = pds.filter((d) => d.product_id === p.id);
    if (p.variants.length) {
      p.priceFrom = Math.min(...p.variants.map((v) => Number(v.price)));
      p.totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
    } else { p.priceFrom = Number(p.base_price || 0); p.totalStock = p.stock; }
  }
  return products;
}

async function listProducts({ category, sub, deity, festival, q, sort = 'featured', limit = 48 } = {}) {
  let qb = db('products as p').where('p.is_active', true).select('p.*').distinct();
  if (category) qb = qb.join('categories as c', 'c.id', 'p.category_id').where('c.slug', category);
  if (sub) qb = qb.join('subcategories as s', 's.id', 'p.subcategory_id').where('s.slug', sub);
  if (deity) qb = qb.join('product_deities as pd', 'pd.product_id', 'p.id').join('deities as d', 'd.id', 'pd.deity_id').where('d.slug', deity);
  if (festival) qb = qb.join('product_festivals as pf', 'pf.product_id', 'p.id').join('festivals as f', 'f.id', 'pf.festival_id').where('f.slug', festival);
  if (q) qb = qb.where((w) => w.where('p.name_en', 'like', `%${q}%`).orWhere('p.name_hi', 'like', `%${q}%`).orWhere('p.description_en', 'like', `%${q}%`));
  if (sort === 'price_asc') qb = qb.orderBy('p.base_price', 'asc');
  else if (sort === 'price_desc') qb = qb.orderBy('p.base_price', 'desc');
  else qb = qb.orderBy([{ column: 'p.is_featured', order: 'desc' }, { column: 'p.sort' }, { column: 'p.id', order: 'desc' }]);
  const rows = await qb.limit(limit);
  return decorate(rows);
}

async function productBySlug(slug) {
  const p = await db('products').where({ slug, is_active: true }).first();
  if (!p) return null;
  await decorate([p]);
  p.images = await db('product_images').where('product_id', p.id).orderBy('sort');
  p.category = await db('categories').where('id', p.category_id).first();
  p.subcategory = p.subcategory_id ? await db('subcategories').where('id', p.subcategory_id).first() : null;
  p.festivals = await db('product_festivals as pf').join('festivals as f', 'f.id', 'pf.festival_id').where('pf.product_id', p.id).select('f.*');
  return p;
}

async function related(p, n = 4) {
  const rows = await db('products').where({ category_id: p.category_id, is_active: true }).whereNot('id', p.id).orderBy('is_featured', 'desc').limit(n);
  return decorate(rows);
}

async function featured(n = 8) { return decorate(await db('products').where({ is_active: true, is_featured: true }).orderBy('sort').limit(n)); }
async function testimonials() { return db('testimonials').where('is_active', true).orderBy('sort'); }
async function faqs() { return db('faqs').where('is_active', true).orderBy('sort'); }
async function visitPlans() { return db('visit_plans').orderBy('sort'); }

module.exports = { categories, deities, festivals, sizeBands, subcategories, settings, listProducts, productBySlug, related, featured, testimonials, faqs, visitPlans, decorate };
