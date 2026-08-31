"""Mobile audit for the Devika site: layout, tap targets, contrast, form, both themes."""
from playwright.sync_api import sync_playwright
import re, sys, datetime

LOCAL = True
BASE = 'file:///home/claude/brand/site' if LOCAL else 'https://proeffico.github.io/devikabydeepika'
PAGES = [(BASE + '/index.html' if LOCAL else BASE + '/', 'EN'),
         (BASE + '/hi/index.html' if LOCAL else BASE + '/hi/', 'HI')]

DEVICES = [
    ('iPhone SE',      375, 667, 2),
    ('small Android',  360, 800, 3),
    ('iPhone 14',      390, 844, 3),
    ('iPhone 14 Pro Max', 430, 932, 3),
    ('tablet',         768, 1024, 2),
]

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    if not cond:
        print('  FAIL  ' + name + (('  -> ' + detail) if detail else ''))

def lum(c):
    def f(v):
        v /= 255
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])
def parse(s):
    m = re.findall(r'[\d.]+', s or '')
    return tuple(float(x) for x in m[:3]) if len(m) >= 3 else None
def ratio(fg, bg):
    a, b = lum(fg)+0.05, lum(bg)+0.05
    return round(max(a, b)/min(a, b), 2)

OVERFLOW_JS = """() => {
  const de = document.documentElement;
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > de.clientWidth + 1 || r.left < -1) {
      const s = getComputedStyle(el);
      // an element allowed to scroll sideways is fine
      let p = el, scrolls = false;
      while (p) { const ps = getComputedStyle(p);
        if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { scrolls = true; break; }
        p = p.parentElement; }
      if (!scrolls) bad.push(el.tagName.toLowerCase() + '.' + (el.className||'').toString().split(' ')[0]
                            + ' right=' + Math.round(r.right));
    }
  });
  return { docOverflow: de.scrollWidth - de.clientWidth, elements: [...new Set(bad)].slice(0, 6) };
}"""

TAP_JS = """() => {
  const small = [];
  document.querySelectorAll('a[href], button, input, select, summary').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;              // hidden
    if (getComputedStyle(el).display === 'none') return;
    if (r.height < 40 || r.width < 40) {
      small.push((el.id || el.tagName.toLowerCase() + '.' + (el.className||'').toString().split(' ')[0])
                 + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)
                 + ' "' + (el.textContent||'').trim().slice(0,18) + '"');
    }
  });
  return [...new Set(small)];
}"""

CONTRAST_JS = """() => { const out=[];
  document.querySelectorAll('h1,h2,h3,h4,p,a,span,button,label,li,summary,td,th').forEach(el=>{
    const t=(el.textContent||'').trim(); if(!t||el.children.length>2) return;
    const cs=getComputedStyle(el); let bg='rgba(0, 0, 0, 0)', n=el;
    while(n && bg==='rgba(0, 0, 0, 0)'){ bg=getComputedStyle(n).backgroundColor; n=n.parentElement; }
    out.push({fg:cs.color, bg:bg, size:parseFloat(cs.fontSize), w:cs.fontWeight, t:t.slice(0,26)});});
  return out; }"""

NAV_JS = """() => {
  const nav = document.querySelector('nav.top');
  const links = [...nav.querySelectorAll('a.lnk')];
  const visible = links.filter(a => getComputedStyle(a).display !== 'none');
  return { total: links.length, visible: visible.length,
           navHeight: Math.round(nav.getBoundingClientRect().height),
           labels: visible.map(a => a.textContent.trim()) };
}"""

def run(pw, url, lang):
    br = pw.chromium.launch()
    for dev, w, h, dpr in DEVICES:
        ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr,
                             is_mobile=True, has_touch=True)
        ctx.route(re.compile(r'fonts\.(googleapis|gstatic)\.com'), lambda r: r.abort())
        pg = ctx.new_page()
        pg.goto(url); pg.wait_for_timeout(900)

        for theme in ['dark', 'light']:
            tag = f'{lang} {dev} {theme}'
            if theme == 'light':
                pg.click('#themeToggle'); pg.wait_for_timeout(250)

            ov = pg.evaluate(OVERFLOW_JS)
            check(tag + ' | no horizontal scroll', ov['docOverflow'] <= 1,
                  f"doc overflow {ov['docOverflow']}px; {ov['elements']}")

            # contrast at this size (font sizes are fluid, so re-check per viewport)
            bad = []
            for d in pg.evaluate(CONTRAST_JS):
                fg, bg = parse(d['fg']), parse(d['bg'])
                if not fg or not bg: continue
                r = ratio(fg, bg)
                large = d['size'] >= 24 or (d['size'] >= 18.66 and int(d['w']) >= 700)
                if r < (3.0 if large else 4.5):
                    bad.append(f"{r} {round(d['size'],1)}px '{d['t']}'")
            check(tag + ' | contrast AA', not bad, '; '.join(bad[:3]))

            if theme == 'light':
                pg.click('#themeToggle'); pg.wait_for_timeout(200)

        # tap targets (dark, the default)
        small = pg.evaluate(TAP_JS)
        check(f'{lang} {dev} | tap targets >= 40px', not small, '; '.join(small[:4]))

        # navigation reachability
        nav = pg.evaluate(NAV_JS)
        check(f'{lang} {dev} | section nav reachable', nav['visible'] > 0,
              f"{nav['visible']}/{nav['total']} links visible, nav {nav['navHeight']}px")
        check(f'{lang} {dev} | nav under 25% of screen', nav['navHeight'] < h * 0.25,
              f"{nav['navHeight']}px of {h}px")

        # images actually painted
        broken = pg.evaluate("""() => [...document.images]
            .filter(i => i.complete && i.naturalWidth === 0).length""")
        check(f'{lang} {dev} | all images load', broken == 0, f'{broken} broken')

        # the form, end to end
        pg.evaluate("window.__o=null; window.open=function(u){window.__o=u;};")
        pg.locator('#book').scroll_into_view_if_needed(); pg.wait_for_timeout(400)
        pg.fill('#nm', 'Mobile Test'); pg.fill('#ph', '9810012345')
        pg.fill('#pin', '122002')
        pg.fill('#dt', (datetime.date.today() + datetime.timedelta(days=5)).isoformat())
        pg.locator('.slots').first.locator('.slot').nth(2).click()
        pg.click('#bookingForm button[type=submit]'); pg.wait_for_timeout(250)
        opened = pg.evaluate('window.__o') or ''
        check(f'{lang} {dev} | booking works', opened.startswith('https://wa.me/'), opened[:40])

        # the confirmation must be visible without hunting for it
        box = pg.evaluate("""() => { const c=document.getElementById('confirm');
            const r=c.getBoundingClientRect(); return {top:Math.round(r.top), h:Math.round(r.height),
            vh: innerHeight}; }""")
        check(f'{lang} {dev} | confirmation on screen', box['top'] < box['vh'] and box['h'] > 0,
              f"top={box['top']} vh={box['vh']}")

        if dev == 'iPhone 14':
            pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
            pg.screenshot(path=f'/tmp/m-{lang.lower()}-top.png')
            pg.locator('#book').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
            pg.screenshot(path=f'/tmp/m-{lang.lower()}-form.png')
        ctx.close()
    br.close()

with sync_playwright() as pw:
    for url, lang in PAGES:
        print(f'=== {lang} ===')
        run(pw, url, lang)

passed = sum(1 for _, ok, _ in results if ok)
print('\n' + '=' * 56)
print(f'  {passed} of {len(results)} mobile checks passed')
fails = [(n, d) for n, ok, d in results if not ok]
if fails:
    seen = set()
    print('  DISTINCT FAILURES:')
    for n, d in fails:
        key = n.split('|')[-1].strip()
        if key in seen: continue
        seen.add(key)
        print(f'   - {key}: {d[:90]}')
print('=' * 56)
sys.exit(0 if not fails else 1)
