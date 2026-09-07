const cfg = require('../config');
/** Build the SEO block a page renders in <head>. `path` is the locale-free path. */
function seo(req, { title, description, path = req.path, image, jsonld = [], noindex = false, type = 'website' }) {
  const p = path === '/' ? '' : path;
  const en = `${cfg.baseUrl}${p || '/'}`, hi = `${cfg.baseUrl}/hi${p || '/'}`;
  return {
    title: title ? `${title} — ${cfg.brand}` : cfg.brand,
    rawTitle: title || cfg.brand,
    description: description || '',
    canonical: req.locale === 'hi' ? hi : en,
    alternates: { en, hi },
    image: image ? `${cfg.baseUrl}/img/${image}` : `${cfg.baseUrl}/img/hero-shrine-dressed.jpg`,
    jsonld: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld }),
    noindex, type,
    locale: req.locale === 'hi' ? 'hi_IN' : 'en_IN',
  };
}
function org() {
  return { '@type': 'Organization', '@id': `${cfg.baseUrl}/#org`, name: cfg.brand, url: `${cfg.baseUrl}/`, logo: `${cfg.baseUrl}/img/logo-full.png`, areaServed: ['Noida', 'India'] };
}
function breadcrumbs(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${cfg.baseUrl}${it.url}` })) };
}
module.exports = { seo, org, breadcrumbs };
