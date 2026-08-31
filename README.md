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
| WhatsApp number | search `910000000000` in both HTML files | Currently a placeholder; every primary CTA points at it |
| Booking form endpoint | `// TODO: POST to your endpoint` near the bottom of both HTML files | The form validates, runs its captcha and confirms, but **sends nothing**. Uncomment the `fetch` and point it at Formspree or your own API |
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

## Form, captcha and spam handling

The booking form validates client-side and is protected three ways, none of which need an external service:

- **Arithmetic captcha** — a random sum, rotated on every failed attempt, with an accessible label and `aria-live` announcement
- **Honeypot** — an off-screen `company` field; any submission that fills it is rejected
- **Time trap** — anything submitted within 2.5 seconds of page load is rejected

Validation covers a 10-digit mobile, a 6-digit pin code, and dates from today onward. Errors render in `#confirm` with `role="alert"` and mark the offending field `aria-invalid`.

**On your own domain, consider swapping the arithmetic check for [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)** — free, no puzzle for most visitors, and much harder to script against. Add its widget script to `<head>` and replace the captcha comparison with `turnstile.getResponse()`. It ships with the built-in check instead because third-party scripts are blocked by CSP in the Claude artifact preview.

### Tests

`test/test_form.py` drives both language versions in headless Chromium — 44 checks covering validation, captcha rotation, honeypot, time trap, slot selection, accessibility attributes, mobile layout and the success path.

```bash
pip install playwright && playwright install chromium
python3 -m http.server 8000 &
python3 test/test_form.py
```

The file paths at the top of the test point at a local build; change `EN` and `HI` to your served URLs.

## SEO

Both pages ship with meta description, canonical, Open Graph, Twitter card, reciprocal `hreflang` (`en`, `hi`, `x-default`), and JSON-LD covering `Organization`, `Service` with a priced `OfferCatalog`, and `FAQPage`. FAQ answers are written answer-first so they can be lifted cleanly by AI search.

Keyword map and content priorities are in [`docs/launch-playbook.md`](docs/launch-playbook.md).

## Browser support

Modern evergreen browsers. Uses CSS custom properties, `aspect-ratio`, `object-fit` and `color-mix()`. Fonts load from Google Fonts (Marcellus + Karla for English; Noto Serif Devanagari + Mukta for Hindi), each with a real fallback stack.

## Licence

All rights reserved. Product photography and brand assets are the property of Devika by Deepika.
