# Devika by Deepika

Marketing site for **Devika by Deepika** — handcrafted deity poshak and *Mandir Seva*, a monthly at-home shrine-dressing service in Delhi NCR, shipping worldwide.

Static site. No build step, no dependencies. Two languages, English and Hindi.

---

## Layout

```
index.html            English site
hi/index.html         Hindi site (हिंदी)
img/                  Product photography used by both pages
img/work/             Installed home-mandir photographs for the "Our work" section
assets/flyers/        10 social ad creatives, 1080×1350
assets/logo/          7 logo lockups (Devanagari + Latin), 2400×1600
docs/                 Launch playbook — ad copy, SEO map, A/B test plan
standalone-en.html    Single-file build with images inlined as data URIs
standalone-hi.html    Same, Hindi
```

`index.html` and `hi/index.html` reference `img/` on disk — use these for hosting. The `standalone-*.html` files carry their images inline and need nothing else; they're for emailing, previewing, or dropping into a page builder.

## Running it

Nothing to install.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying

Any static host works — Netlify, Vercel, Cloudflare Pages, GitHub Pages, or an S3 bucket. Publish the repository root. `hi/index.html` becomes `/hi/`, which is what the `hreflang` tags expect.

For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.

---

## Before this goes live

These are placeholders. The site will function without fixing them, but it should not be advertised until they are done.

| What | Where | Why |
|---|---|---|
| `og-image.jpg` | referenced in `<head>` of both files | Not in the repo yet. Use `assets/flyers/devika_P1_seva_shrine.png` |
| Analytics / Meta Pixel | `<head>` | Without it, ad spend teaches you nothing |
| Canonical domain | `devikabydeepika.com` in canonical, `hreflang` and JSON-LD | Update if the domain changes |

**Not yet cleared:** the trademark. "Devika" has existing use in Indian apparel (classes 24 and 25). The compound mark is more likely registrable than the bare word — get an attorney's opinion before spending on packaging or ads under this name.

---

## Content notes

**The "who touches the idol" block** in the Mandir Seva section is load-bearing. That objection stops this business faster than price does, and the stated default — *we prepare, you dress* — is what removes it. Don't let it get edited into something vaguer.

**Known copy mismatch:** the Nitya card promises "soft cotton, machine-friendly, worn and washed often" but shows a pearl-worked poshak. Needs either a plain-cotton photograph or rewritten copy.

**Customer photographs.** The eight images in `img/work/` are installations inside private homes, and the page states they are shared with permission. Get that permission in writing before the site goes public. Two frames from the source set were left out on purpose — one was unusable from flash glare, the other contained framed portraits of an identifiable person.

**Prices** in the page and in the JSON-LD `OfferCatalog` must stay in sync. Schema that contradicts visible page text gets penalised.

## The booking form

**There is no backend and no form endpoint.** The form is a message composer: it validates what you typed, then opens WhatsApp with the whole enquiry written out, ready to send.

The number lives in one place — `var WA = '919355110366';` at the top of the form script in each HTML file. The form and the header button both read it, so changing it is a single edit per language.

```
Mandir Seva booking request

Name: ...
Mobile: ...
Pin code: ...
Plan: ...
Preferred date: Sunday 6 September, 2026
Preferred window: 4–6 pm
Who dresses the deity: ...
Idol height: ...
```

Validation covers a 10-digit mobile, a 6-digit pin code, and dates from today onward. Errors render in `#confirm` with `role="alert"` and mark the offending field `aria-invalid`. A fallback link is shown in case the popup is blocked.

**Why there is no captcha.** An earlier version had an arithmetic captcha, a honeypot and a timing trap. With WhatsApp as the only channel there is nothing to spam — no endpoint, no inbox reachable from the page, no database — so the captcha only cost conversions. If you ever add a real form endpoint, put those protections back (or use [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)); until then it would be friction for nothing.

### Tests

`test/test_form.py` drives both language versions in headless Chromium — 52 checks covering validation, the generated WhatsApp URL and every field inside it, the fallback link, single-source-of-truth for the number, mobile layout and the success path. It intercepts `window.open`, so no chat actually launches.

```bash
pip install playwright && playwright install chromium
python3 -m http.server 8000 &
python3 test/test_form.py
```

The file paths at the top of the test point at a local build; change `EN` and `HI` to your served URLs.

## SEO

Both pages ship with meta description, canonical, Open Graph, Twitter card, reciprocal `hreflang` (`en`, `hi`, `x-default`), and JSON-LD covering `Organization`, `Service` with a priced `OfferCatalog`, and `FAQPage`. FAQ answers are written answer-first so they can be lifted cleanly by AI search.

Keyword map and content priorities are in [`docs/launch-playbook.md`](docs/launch-playbook.md).

## Colour and themes

**Dark is the default. Light is one click away**, via the toggle in the nav. The choice is stored in `localStorage` under `devika-theme` and restored on the next visit; a small inline script at the top of the document applies it before first paint, so there is no flash of the wrong theme.

The site deliberately ignores `prefers-color-scheme`. Dark is the brand's look and every visitor sees it first, whatever their OS is set to.

Both palettes live in one `:root` block per file — dark on bare `:root`, light on `:root[data-theme="light"]`. **Every colour in the stylesheet comes from a token**, including section tints, gradients, button foregrounds and the nav background. If you add a rule, take its colour from a token rather than hard-coding a hex, or it will break in one of the two themes.

| Token | Dark | Light |
|---|---|---|
| `--night` main ground | `#150E19` plum-black | `#FFFBF5` warm ivory |
| `--night-2` raised band | `#1E1421` | `#FCF2E4` saffron tint |
| `--paper` alternating section | `#F5F1EC` ivory | `#FFFFFF` |
| `--sec-collections` | ivory | `#FDEDEF` blush |
| `--sec-book` | ivory | `#EDF6F0` mint |
| `--brass` accent | `#C89B4A` | `#8E5F17` |
| `--brass-deep` small accent text | `#7E5310` | `#6F4610` |
| `--on-brass` button text | `#1A1119` | `#FFFFFF` |

Brass has to differ between themes: the gold that glows on near-black fails contrast on ivory, and the brown that reads on ivory disappears on black.

All 191 rendered text/background pairs pass WCAG AA **in both themes, on both language versions** — checked programmatically. Re-run that check if you touch any colour.

## Browser support

Modern evergreen browsers. Uses CSS custom properties, `aspect-ratio`, `object-fit` and `color-mix()`. Fonts load from Google Fonts (Marcellus + Karla for English; Noto Serif Devanagari + Mukta for Hindi), each with a real fallback stack.

## Licence

All rights reserved. Product photography and brand assets are the property of Devika by Deepika.
