const express = require('express');
const catalog = require('../services/catalog');
const pricing = require('../lib/pricing');
const { seo, org, breadcrumbs } = require('../lib/seo');
const cfg = require('../config');
const r = express.Router();

const tr = (req) => (row, f) => row?.[`${f}_${req.locale}`] || row?.[`${f}_en`] || '';

// ---------- home ----------
r.get('/', async (req, res) => {
  const [cats, deities, fests, feats, voices, plans, faqs] = await Promise.all([
    catalog.categories(), catalog.deities(), catalog.festivals(), catalog.featured(8), catalog.testimonials(), catalog.visitPlans(), catalog.faqs(),
  ]);
  const t = res.locals.t;
  res.render('pages/home', {
    cats, deities, fests, feats, voices, plans, faqs: faqs.slice(0, 5),
    seo: seo(req, { title: req.locale === 'hi' ? 'अपना मंदिर तैयार कीजिए' : 'Get your mandir ready', description: t.hero.lede, path: '/', jsonld: [org(), {
      '@type': 'WebSite', url: `${cfg.baseUrl}/`, name: cfg.brand, potentialAction: { '@type': 'SearchAction', target: `${cfg.baseUrl}/shop?q={q}`, 'query-input': 'required name=q' } },
      { '@type': 'FAQPage', mainEntity: faqs.slice(0, 5).map((f) => ({ '@type': 'Question', name: tr(req)(f, 'q'), acceptedAnswer: { '@type': 'Answer', text: tr(req)(f, 'a') } })) }] }),
  });
});

// ---------- shop ----------
async function shopPage(req, res, filters, crumbs, title, description, extra = {}) {
  const [cats, deities, fests, bands, products] = await Promise.all([catalog.categories(), catalog.deities(), catalog.festivals(), catalog.sizeBands(), catalog.listProducts({ ...filters, q: req.query.q, sort: req.query.sort })]);
  const path = req.path;
  res.render('pages/shop', {
    cats, deities, fests, bands, products, filters, title, description, ...extra,
    seo: seo(req, { title, description, path, jsonld: [org(), breadcrumbs([{ name: 'Home', url: '/' }, ...crumbs]),
      { '@type': 'ItemList', itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${cfg.baseUrl}${req.L}/product/${p.slug}` })) }] }),
  });
}
r.get('/shop', (req, res) => shopPage(req, res, {}, [{ name: 'Shop', url: '/shop' }], res.locals.t.shop.all,
  req.locale === 'hi' ? 'भगवान जी की पोशाक, शृंगार, मंदिर सजावट और मूर्तियाँ — श्रेणी, विग्रह या त्योहार से देखिए।' : 'Deity poshak, shringar, mandir decor and idols — shop by category, by deity, or by festival.'));

r.get('/shop/:category', async (req, res, next) => {
  const c = (await catalog.categories()).find((x) => x.slug === req.params.category); if (!c) return next();
  const subs = await catalog.subcategories(c.id);
  shopPage(req, res, { category: c.slug }, [{ name: 'Shop', url: '/shop' }, { name: c.name_en, url: `/shop/${c.slug}` }], tr(req)(c, 'name'), tr(req)(c, 'blurb'), { category: c, subs });
});
r.get('/shop/:category/:sub', async (req, res, next) => {
  const c = (await catalog.categories()).find((x) => x.slug === req.params.category); if (!c) return next();
  const subs = await catalog.subcategories(c.id); const s = subs.find((x) => x.slug === req.params.sub); if (!s) return next();
  shopPage(req, res, { category: c.slug, sub: s.slug }, [{ name: 'Shop', url: '/shop' }, { name: c.name_en, url: `/shop/${c.slug}` }, { name: s.name_en, url: `/shop/${c.slug}/${s.slug}` }],
    `${tr(req)(s, 'name')} — ${tr(req)(c, 'name')}`, tr(req)(c, 'blurb'), { category: c, subs, sub: s });
});

// ---------- deity landing (the SEO workhorse) ----------
r.get('/deity/:slug', async (req, res, next) => {
  const d = (await catalog.deities()).find((x) => x.slug === req.params.slug); if (!d) return next();
  const [cats, deities, fests, bands, products] = await Promise.all([catalog.categories(), catalog.deities(), catalog.festivals(), catalog.sizeBands(), catalog.listProducts({ deity: d.slug })]);
  const title = req.locale === 'hi' ? `${d.name_hi} की ${d.garment_hi}` : `${d.name_en} ${d.garment_en.toLowerCase()} & shringar`;
  res.render('pages/deity', { d, cats, deities, fests, bands, products, seo: seo(req, { title, description: tr(req)(d, 'intro'), path: req.path, image: d.image,
    jsonld: [org(), breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Deities', url: '/shop' }, { name: d.name_en, url: `/deity/${d.slug}` }])] }) });
});

// ---------- festival landing ----------
r.get('/festivals', async (req, res) => {
  const fests = await catalog.festivals();
  res.render('pages/festivals', { fests, seo: seo(req, { title: res.locals.t.fest.eyebrow, description: res.locals.t.fest.lede, path: '/festivals', jsonld: [org()] }) });
});
r.get('/festival/:slug', async (req, res, next) => {
  const f = (await catalog.festivals()).find((x) => x.slug === req.params.slug); if (!f) return next();
  const products = await catalog.listProducts({ festival: f.slug });
  const title = req.locale === 'hi' ? `${f.name_hi} पैक और सामान` : `${f.name_en} pack & shop`;
  res.render('pages/festival', { f, products, seo: seo(req, { title, description: tr(req)(f, 'pack'), path: req.path, image: f.image,
    jsonld: [org(), breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Festivals', url: '/festivals' }, { name: f.name_en, url: `/festival/${f.slug}` }])] }) });
});

// ---------- product ----------
r.get('/product/:slug', async (req, res, next) => {
  const p = await catalog.productBySlug(req.params.slug); if (!p) return next();
  const rel = await catalog.related(p);
  const bands = await catalog.sizeBands();
  const T = tr(req);
  const offers = p.variants.length
    ? p.variants.map((v) => ({ '@type': 'Offer', price: Number(v.price), priceCurrency: 'INR', availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', name: `${v.band.code} ${v.band.label_en}`, url: `${cfg.baseUrl}${req.L}/product/${p.slug}` }))
    : [{ '@type': 'Offer', price: Number(p.base_price || 0), priceCurrency: 'INR', availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${cfg.baseUrl}${req.L}/product/${p.slug}` }];
  res.render('pages/product', { p, rel, bands, seo: seo(req, { title: T(p, 'meta_title') || T(p, 'name'), description: T(p, 'meta_desc') || T(p, 'description')?.slice(0, 300), path: req.path, image: p.image?.path, type: 'product',
    jsonld: [org(), breadcrumbs([{ name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }, { name: p.category.name_en, url: `/shop/${p.category.slug}` }, { name: p.name_en, url: `/product/${p.slug}` }]),
      { '@type': 'Product', name: T(p, 'name'), description: T(p, 'description'), image: p.images.map((i) => `${cfg.baseUrl}/img/${i.path}`), sku: p.sku || p.slug, brand: { '@type': 'Brand', name: cfg.brand }, material: T(p, 'fabric') || undefined, offers }] }) });
});

// ---------- dress pack builder ----------
r.get('/dress-pack', async (req, res) => {
  const [deities, bands, bp, ladder] = await Promise.all([catalog.deities(), catalog.sizeBands(), pricing.bandPrices(), require('../db')('combo_discounts').orderBy('deity_count')]);
  const t = res.locals.t;
  res.render('pages/pack', { deities, bands, bp, ladder, seo: seo(req, { title: t.pack.eyebrow, description: t.pack.lede, path: '/dress-pack', jsonld: [org(), { '@type': 'Service', name: 'Dress combo pack', provider: { '@id': `${cfg.baseUrl}/#org` }, description: t.pack.lede, areaServed: 'India' }] }) });
});
r.post('/dress-pack/price', express.json(), async (req, res, next) => {
  try {
    const items = (Array.isArray(req.body.items) ? req.body.items : []).slice(0, 12).map((i) => ({ deity_id: Number(i.deity_id), band_code: String(i.band_code || '').slice(0, 3) }));
    const deities = await catalog.deities();
    const priced = await pricing.pricePack(items.map((i) => ({ ...i, pieces: deities.find((d) => d.id === i.deity_id)?.pieces_per_set || 1 })), req.body.rhythm === 'quarterly' ? 'quarterly' : 'monthly');
    res.json(priced);
  } catch (e) { next(e); }
});

// ---------- mandir seva ----------
r.get('/mandir-seva', async (req, res) => {
  const [plans, faqs] = await Promise.all([catalog.visitPlans(), catalog.faqs()]);
  const t = res.locals.t;
  res.render('pages/seva', { plans, faqs, seo: seo(req, { title: t.seva.eyebrow, description: t.seva.lede, path: '/mandir-seva', jsonld: [org(), { '@type': 'Service', name: 'Mandir Seva - at-home shrine service', serviceType: 'Home temple cleaning and deity dressing service', provider: { '@id': `${cfg.baseUrl}/#org` }, areaServed: { '@type': 'Place', name: 'Noida Sector 107' },
    offers: { '@type': 'OfferCatalog', name: 'Visit plans', itemListElement: plans.map((p) => ({ '@type': 'Offer', name: `Visit plan - ${p.label_en}`, price: Number(p.monthly_price), priceCurrency: 'INR' })) } }] }) });
});

// ---------- story, voices, work, faq, policies ----------
r.get('/story', async (req, res) => {
  const voices = await catalog.testimonials();
  res.render('pages/story', { voices, seo: seo(req, { title: res.locals.t.story.eyebrow, description: res.locals.t.story.ps[0], path: '/story', jsonld: [org()] }) });
});
r.get('/faq', async (req, res) => {
  const faqs = await catalog.faqs(); const T = tr(req);
  res.render('pages/faq', { faqs, seo: seo(req, { title: res.locals.t.faq.h2, description: res.locals.t.faq.eyebrow, path: '/faq', jsonld: [org(), { '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: T(f, 'q'), acceptedAnswer: { '@type': 'Answer', text: T(f, 'a') } })) }] }) });
});
for (const page of ['privacy', 'terms', 'refunds', 'contact']) {
  r.get(`/${page}`, (req, res) => res.render(`pages/${page}`, { seo: seo(req, { title: res.locals.t.footer[page] || page, path: `/${page}`, jsonld: [org()] }) }));
}

// ---------- robots & sitemap ----------
r.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nSitemap: ${cfg.baseUrl}/sitemap.xml\n`));
r.get('/sitemap.xml', async (req, res) => {
  const [cats, deities, fests, products] = await Promise.all([catalog.categories(), catalog.deities(), catalog.festivals(), catalog.listProducts({ limit: 5000 })]);
  const urls = ['/', '/shop', '/dress-pack', '/mandir-seva', '/festivals', '/story', '/faq', '/sevadar', '/book'];
  for (const c of cats) { urls.push(`/shop/${c.slug}`); for (const s of await catalog.subcategories(c.id)) urls.push(`/shop/${c.slug}/${s.slug}`); }
  for (const d of deities) urls.push(`/deity/${d.slug}`);
  for (const f of fests) urls.push(`/festival/${f.slug}`);
  for (const p of products) urls.push(`/product/${p.slug}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.map((u) => `<url><loc>${cfg.baseUrl}${u}</loc><xhtml:link rel="alternate" hreflang="en" href="${cfg.baseUrl}${u}"/><xhtml:link rel="alternate" hreflang="hi" href="${cfg.baseUrl}/hi${u === '/' ? '/' : u}"/></url>`).join('\n') + '\n</urlset>';
  res.type('application/xml').send(xml);
});

module.exports = r;
