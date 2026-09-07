"""End-to-end tests for the Devika booking form (English + Hindi).

The form no longer posts anywhere: it validates, then opens a prefilled
WhatsApp chat. These tests intercept window.open and assert on the URL.
"""
from playwright.sync_api import sync_playwright
from urllib.parse import unquote
import datetime, re, sys

EN = 'file:///home/claude/brand/site/index.html'
HI = 'file:///home/claude/brand/site/hi/index.html'
TODAY = datetime.date.today()
FUTURE = (TODAY + datetime.timedelta(days=6)).isoformat()
PAST = (TODAY - datetime.timedelta(days=3)).isoformat()

results = []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS  ' if cond else 'FAIL  ') + name + (('  -> ' + detail) if detail else ''))

def fill(page, name='Saurabh Vaish', phone='98100 12345', pin='122002', date=FUTURE, idol='7 inches'):
    page.fill('#nm', name); page.fill('#ph', phone)
    page.fill('#pin', pin); page.fill('#dt', date); page.fill('#idl', idol)

def out(page):
    el = page.locator('#confirm')
    return (el.inner_text() if el.is_visible() else ''), (el.get_attribute('class') or '')

def trap(page):
    """Capture window.open instead of launching WhatsApp."""
    page.evaluate("window.__opened = null; window.open = function(u){ window.__opened = u; return null; };")

def opened(page):
    u = page.evaluate("window.__opened")
    return unquote(u) if u else ''

def run(pw, url, label):
    print('\n=== ' + label + ' ===')
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(re.compile(r'fonts\.(googleapis|gstatic)\.com'), lambda r: r.abort())
    pg = ctx.new_page()
    pg.goto(url); pg.wait_for_timeout(600)
    pg.locator('#book').scroll_into_view_if_needed()
    trap(pg)

    # --- no captcha, no honeypot, no dead endpoint ---
    check(label + ' | captcha removed', pg.locator('#capq').count() == 0)
    check(label + ' | honeypot removed', pg.locator('input[name="company"]').count() == 0)
    src = pg.content()
    check(label + ' | no formspree/fetch placeholder left', 'formspree' not in src.lower())

    # --- validation still holds ---
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | empty form rejected', 'err' in cls, txt[:60])
    check(label + ' | nothing opened on failure', opened(pg) == '')

    fill(pg, phone='98100'); pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | short phone rejected', 'err' in cls, txt[:60])
    check(label + ' | phone marked invalid', pg.get_attribute('#ph', 'aria-invalid') == 'true')

    fill(pg, pin='1220'); pg.click('#bookingForm button[type=submit]')
    check(label + ' | short pin rejected', 'err' in out(pg)[1])

    fill(pg, date=PAST); pg.click('#bookingForm button[type=submit]')
    check(label + ' | past date rejected', 'err' in out(pg)[1])
    check(label + ' | still nothing opened', opened(pg) == '')

    # --- the happy path opens WhatsApp with everything filled in ---
    pg.locator('.slots').first.locator('.slot').nth(3).click()
    pg.locator('.slots').nth(1).locator('.slot').nth(1).click()
    win = pg.locator('.slots').first.locator('.slot[aria-pressed="true"]').inner_text().strip()
    who = pg.locator('.slots').nth(1).locator('.slot[aria-pressed="true"]').inner_text().strip()
    fill(pg)
    pg.select_option('#pl', index=2)
    plan = pg.locator('#pl option:checked').inner_text().strip()
    pg.click('#bookingForm button[type=submit]')
    pg.wait_for_timeout(150)

    u = opened(pg)
    txt, cls = out(pg)
    check(label + ' | valid submit opens wa.me', u.startswith('https://wa.me/'), u[:48])
    check(label + ' | message carries the name', 'Saurabh Vaish' in u)
    check(label + ' | phone normalised to digits', '9810012345' in u, 'input had a space')
    check(label + ' | message carries the pin', '122002' in u)
    check(label + ' | message carries the plan', plan.split()[0] in u, plan)
    check(label + ' | message carries the chosen window', win in u, win)
    check(label + ' | message carries dressing preference', who in u, who)
    check(label + ' | message carries idol height', '7 inches' in u)
    check(label + ' | date is readable, not ISO', FUTURE not in u and str(TODAY.year) in u)
    check(label + ' | confirmation is not an error', 'err' not in cls)
    check(label + ' | fallback link present', pg.locator('#waFallback').count() == 1)
    check(label + ' | fallback href matches opened url',
          pg.get_attribute('#waFallback', 'href') and
          unquote(pg.get_attribute('#waFallback', 'href')) == u)

    # --- one number, one place ---
    nums = set(re.findall(r'wa\.me/(\d+)', pg.content()))
    check(label + ' | single WhatsApp number on the page', len(nums) == 1, str(nums))
    check(label + ' | header button wired from the same constant',
          pg.get_attribute('#waDirect', 'href').startswith('https://wa.me/'))

    # --- mobile ---
    pg4 = ctx.new_page(); pg4.set_viewport_size({'width': 390, 'height': 780})
    pg4.goto(url); pg4.wait_for_timeout(600)
    ov = pg4.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    check(label + ' | no horizontal scroll at 390px', ov <= 1, 'overflow=' + str(ov))
    pg4.locator('#book').scroll_into_view_if_needed()
    trap(pg4); fill(pg4)
    pg4.click('#bookingForm button[type=submit]'); pg4.wait_for_timeout(150)
    check(label + ' | works on mobile', opened(pg4).startswith('https://wa.me/'))
    pg4.screenshot(path='/tmp/form-mobile-' + label.lower() + '.png')

    pg.locator('#book').scroll_into_view_if_needed()
    pg.screenshot(path='/tmp/form-' + label.lower() + '.png')
    print('\n  --- message that would be sent (' + label + ') ---')
    for line in u.split('text=')[-1].split('\n'):
        print('  | ' + line)
    br.close()

with sync_playwright() as pw:
    run(pw, EN, 'EN')
    run(pw, HI, 'HI')

passed = sum(1 for _, ok, _ in results if ok)
print('\n' + '=' * 52)
print('  {} of {} checks passed'.format(passed, len(results)))
fails = [n for n, ok, _ in results if not ok]
if fails:
    print('  FAILING:')
    for f in fails:
        print('   - ' + f)
print('=' * 52)
sys.exit(0 if not fails else 1)
