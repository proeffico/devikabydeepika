"""End-to-end tests for the Devika booking form (English + Hindi)."""
from playwright.sync_api import sync_playwright
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

def solve(page):
    q = page.locator('#capq').inner_text()          # "3 + 4 ="
    a, b = [int(x) for x in re.findall(r'\d+', q)]
    return str(a + b)

def fill(page, name='Saurabh Vaish', phone='9810012345', pin='122002', date=FUTURE, idol='7 inches'):
    page.fill('#nm', name); page.fill('#ph', phone)
    page.fill('#pin', pin); page.fill('#dt', date); page.fill('#idl', idol)

def out(page):
    el = page.locator('#confirm')
    return (el.inner_text() if el.is_visible() else ''), (el.get_attribute('class') or '')

def run(pw, url, label):
    print('\n=== ' + label + ' ===')
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route(re.compile(r'fonts\.(googleapis|gstatic)\.com'), lambda r: r.abort())
    pg = ctx.new_page()
    pg.goto(url); pg.wait_for_timeout(2600)         # also clears the 2.5s time-trap
    pg.locator('#book').scroll_into_view_if_needed()

    # 1. empty submit
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | empty form is rejected', 'err' in cls and len(txt) > 10, txt[:60])

    # 2. short phone
    fill(pg, phone='98100')
    pg.fill('#cap', solve(pg))
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | 5-digit phone rejected', 'err' in cls, txt[:60])
    check(label + ' | phone field marked invalid',
          pg.get_attribute('#ph', 'aria-invalid') == 'true')

    # 3. bad pin
    fill(pg, pin='1220')
    pg.fill('#cap', solve(pg))
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | 4-digit pin rejected', 'err' in cls, txt[:60])

    # 4. past date
    fill(pg, date=PAST)
    pg.fill('#cap', solve(pg))
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    check(label + ' | past date rejected', 'err' in cls, txt[:60])

    # 5. wrong captcha
    fill(pg)
    before = pg.locator('#capq').inner_text()
    pg.fill('#cap', '999')
    pg.click('#bookingForm button[type=submit]')
    txt, cls = out(pg)
    after = pg.locator('#capq').inner_text()
    check(label + ' | wrong captcha rejected', 'err' in cls, txt[:60])
    check(label + ' | captcha rotates after a failure', before != after,
          before + ' -> ' + after)
    check(label + ' | captcha input cleared on rotate', pg.input_value('#cap') == '')

    # 6. "New question" button
    b1 = pg.locator('#capq').inner_text()
    pg.click('#capnew'); pg.wait_for_timeout(120)
    check(label + ' | new-question button works', pg.locator('#capq').inner_text() != b1)

    # 7. slot + dressing preference selection
    pg.locator('.slots').first.locator('.slot').nth(3).click()
    pg.locator('.slots').nth(1).locator('.slot').nth(1).click()
    pressed = pg.locator('.slots').first.locator('.slot[aria-pressed="true"]')
    check(label + ' | only one time slot stays selected', pressed.count() == 1,
          pressed.inner_text())

    # 8. happy path
    fill(pg)
    pg.select_option('#pl', index=2)
    pg.fill('#cap', solve(pg))
    pg.click('#bookingForm button[type=submit]')
    pg.wait_for_timeout(200)
    txt, cls = out(pg)
    ok = ('err' not in cls) and ('Saurabh' in txt) and ('122002' in txt) \
         and (str(TODAY.year) in txt) and (FUTURE not in txt)
    check(label + ' | valid booking accepted', ok, txt[:110])
    check(label + ' | submit disabled after success',
          pg.is_disabled('#bookingForm button[type=submit]'))
    check(label + ' | confirmation echoes the chosen window',
          pressed.inner_text().strip() in txt, pressed.inner_text().strip())
    check(label + ' | confirmation shows a readable date, not ISO',
          FUTURE not in txt and str(TODAY.year) in txt, txt[:110])

    # 9. honeypot
    pg2 = ctx.new_page()
    pg2.goto(url); pg2.wait_for_timeout(2600)
    pg2.locator('#book').scroll_into_view_if_needed()
    fill(pg2)
    pg2.fill('#cap', solve(pg2))
    pg2.eval_on_selector('input[name="company"]', 'el => el.value = "bot-filled"')
    pg2.click('#bookingForm button[type=submit]')
    txt, cls = out(pg2)
    check(label + ' | honeypot blocks bots', 'err' in cls, txt[:60])
    check(label + ' | honeypot is off-screen',
          pg2.eval_on_selector('.hp', 'el => el.getBoundingClientRect().left < -1000'))
    check(label + ' | honeypot not keyboard-reachable',
          pg2.get_attribute('input[name="company"]', 'tabindex') == '-1')

    # 10. time trap
    pg3 = ctx.new_page()
    pg3.goto(url); pg3.wait_for_timeout(350)
    pg3.locator('#book').scroll_into_view_if_needed()
    fill(pg3)
    pg3.fill('#cap', solve(pg3))
    pg3.click('#bookingForm button[type=submit]')
    txt, cls = out(pg3)
    check(label + ' | sub-2.5s submit blocked', 'err' in cls, txt[:60])

    # 11. accessibility bits
    check(label + ' | captcha has an accessible label',
          bool(pg.get_attribute('#cap', 'aria-label')))
    check(label + ' | question announced politely',
          pg.get_attribute('#capq', 'aria-live') == 'polite')

    # 12. mobile layout, no horizontal scroll
    pg4 = ctx.new_page(); pg4.set_viewport_size({'width':390,'height':780})
    pg4.goto(url); pg4.wait_for_timeout(2600)
    ov = pg4.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    check(label + ' | no horizontal scroll at 390px', ov <= 1, 'overflow=' + str(ov))
    pg4.locator('#book').scroll_into_view_if_needed()
    fill(pg4)
    pg4.fill('#cap', solve(pg4))
    pg4.click('#bookingForm button[type=submit]')
    txt, cls = out(pg4)
    check(label + ' | booking works on mobile', 'err' not in cls and 'Saurabh' in txt, txt[:70])
    pg4.screenshot(path='/tmp/form-mobile-' + label.lower() + '.png')

    pg.locator('#book').scroll_into_view_if_needed()
    pg.screenshot(path='/tmp/form-' + label.lower() + '.png')
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
