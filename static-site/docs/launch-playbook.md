# Devika by Deepika — launch playbook
**Built 30 August 2026. Everything here is a draft for you to approve, not a live campaign.**

---

## 0. Assumptions I made (change any of these)

You were asleep, so I decided rather than waited. Each of these is easy to change:

| Assumption | What I used | Why |
|---|---|---|
| Pilot city | Gurugram, South Delhi, Noida, Dwarka | Premium apartment density, highest NRI-parent concentration, one ops cluster |
| Trial offer | ₹299 first visit | Low enough to remove risk, high enough to filter tyre-kickers |
| Plan prices | ₹699 / ₹1,199 / ₹2,499 monthly | Straight from the unit-economics model — Utsav is the margin tier, so it's positioned as "most chosen" |
| Quarterly | ~10% saving, billed once | Cash upfront, lower churn |
| Global | Product box only, USD 39 / 59 | You can't staff visits abroad |
| Lead capture | WhatsApp first, form second | Zero backend needed tomorrow |
| Festival dates | Deliberately not printed | I don't know the 2026–27 panchang dates and won't invent them |

**Two things I could not verify and you must check before spending:** the `devikabydeepika.com` domain is still open (it was this morning), and whether "Devika" collides in trademark class 25. Nothing in the ads should go live under a name you haven't cleared.

---

## 1. The website

`devika-index.html` — one file, no build step, no dependencies except Google Fonts. Upload it to Netlify, Vercel, Hostinger or an S3 bucket and it works. Sections in order:

1. Hero — "Your mandir, dressed with care — every single month"
2. Trust bar — four proof points
3. Four collections — Nitya, Utsav, Shringar, Mandir
4. Mandir Seva — the four-step visit, plus the "who touches the idol" answer and the apartment-specific trust block
5. Plans — monthly and quarterly, plus the global box and the circular promise
6. Six festival packages
7. Booking — self-serve date, time window, plan, idol size, and the dressing preference
8. Seven-question FAQ
9. Footer

### Before it goes live — 5 things

1. **WhatsApp number.** Search `910000000000` and replace it. Currently a placeholder.
2. **Wire the form.** It validates and confirms client-side but sends nothing. Fastest fix: a free Formspree endpoint on the `<form>` tag, or point everything at WhatsApp and delete the form.
3. **Photos.** Five placeholder blocks are labelled. The hero one matters most — one dressed idol, warm side light, deep shadow. A phone photo of a real shrine beats stock.
4. **`og-image.jpg`** — the meta tags reference it. Use flyer A2; it's the strongest single-image summary.
5. **Analytics + Meta Pixel** in the `<head>`, or you learn nothing tomorrow.

### The "who touches the idol" block is the most important thing on the page

It sits high in the Seva section on purpose. From the research, that objection kills this business faster than price does. The default answer — *we prepare, you dress* — removes it. Do not let anyone edit that paragraph into something vaguer.

---

## 2. SEO and AI-search

### Already built into the file

- `<title>`, meta description, canonical, robots, Open Graph, Twitter card
- JSON-LD with `Organization`, `Service` (with a priced `OfferCatalog`), and a six-question `FAQPage`
- Semantic heading order, one H1, descriptive `aria-label` on the image placeholders
- Answer-first paragraphs written so an LLM can lift them cleanly

### Keyword map — what to build next

**Transactional, buy now:**
`laddu gopal poshak online` · `laddu gopal dress size 0` · `radha krishna poshak set` · `ganesh ji dress for idol` · `deity dress online India` · `thakur ji poshak`

**The category you can own outright** (almost no competition, because nobody sells it):
`mandir decoration service at home` · `home temple cleaning service Gurugram` · `pooja room decoration service Delhi NCR` · `monthly poshak subscription` · `idol dressing service near me`

**Informational, feeds AI answers:**
`how to measure laddu gopal poshak size` · `what to do with old deity clothes` · `how often to change laddu gopal dress` · `how to dispose of puja items respectfully` · `laddu gopal winter dress`

**Diaspora:**
`laddu gopal dress USA` · `poshak shipping to UK` · `gift puja seva to parents in India`

### Content to write, in priority order

1. **"What to do with old deity clothes — the respectful options"** — this is a real, high-volume, badly-answered question. Rank for it and you own the takeback story. Highest ROI page on the site.
2. **"Laddu Gopal poshak size guide — measure your idol in 30 seconds"** — the biggest conversion blocker in this category. Add a photo-with-scale trick.
3. **"How often should you change your deity's poshak?"** — sells the subscription by answering honestly.
4. **Festival prep guides** — one per package, published 3 weeks before each festival.

### Getting quoted by ChatGPT, Gemini and AI Overviews

The pattern is the same everywhere: answer in the first two sentences, in plain declarative prose, with a specific number or name. The FAQ answers on the site are already written this way — keep that discipline in the blog. Also do these:

- Google Business Profile for the service area. Local + service = the single best AI-citation source you can control.
- Get listed anywhere that publishes "best poshak brands" roundups — LLMs lean heavily on list articles.
- Keep the JSON-LD in sync with real prices. Contradictions between schema and page text get you dropped.
- Publish under a named author with a real bio. Faith content is a YMYL-adjacent topic and unattributed pages struggle.

---

## 3. The six flyers and their ad copy

All at 1080×1350 (4:5 — the best-performing feed ratio; also crops fine to 1:1). Three angles, six creatives.

### A1 — `devika_A1_convenience_question.png`
> **Headline:** When did you last change His poshak?
> **Primary text:** Between work, school runs and everything else, the shrine quietly waits. Devika comes to your home every month — mandir cleaned, fresh poshak, new flowers, forty-five quiet minutes. First visit ₹299.
> **CTA:** Book Now

### A2 — `devika_A2_convenience_offer.png`
> **Headline:** Your mandir, dressed every month — from ₹699
> **Primary text:** Handcrafted poshak, a clean shrine and fresh shringar, at a time you choose. We take the old poshak away and recycle it respectfully. Now serving Gurugram, South Delhi, Noida and Dwarka.
> **CTA:** Learn More

### B1 — `devika_B1_craft_statement.png`
> **Headline:** In our homes, the divine is dressed each morning
> **Primary text:** Every Devika poshak is handcrafted in Vrindavan and made to your idol's measurements. Cotton for every day, Banarasi silk for the festival, hand zardozi when it matters most. Delivered before the date, never after.
> **CTA:** Shop Now

### C1 — `devika_C1_circular_question.png`
> **Headline:** What do you do with the old poshak?
> **Primary text:** Most families keep them in a cupboard for years, unsure what's respectful — and immersion isn't an option in most cities any more. We collect them, rework them into asan, chandani and temple wicks, and send you a photo of what yours became. Never resold. Never shredded.
> **CTA:** Learn More

### C2 — `devika_C2_circular_promise.png`
> **Headline:** We take the old poshak back. And we show you what it became.
> **Primary text:** Every Devika plan includes respectful takeback. Reworked into shrine textiles, cut into wicks for temple lamps, or ceremonially burnt with the ash returned to you. Plans from ₹699 a month.
> **CTA:** Sign Up

### D1 — `devika_D1_nri_gift.png`
> **Headline:** You're eight thousand miles from their mandir
> **Primary text:** Gift your parents a monthly Mandir Seva at home in India. We visit, clean the shrine, dress the deity in a fresh poshak — and send you the photographs. Pay in USD, GBP or AED.
> **CTA:** Send Gift

---

## 4. How to run the test tomorrow

### Structure

One campaign, objective **Traffic** (not Conversions — you won't have enough pixel data on day one). Six ad sets is too many for a small budget, so:

- **Ad set 1 — India, Delhi NCR.** Creatives A1, A2, B1, C1, C2 in one ad set. Let Meta's delivery pick winners.
- **Ad set 2 — Diaspora.** Creative D1 only. Target US, UK, UAE, Canada; interest = Hinduism / Indian culture; age 30–60.

Keeping India creatives in a single ad set means the algorithm optimises between them instead of you splitting budget into statistical noise.

### Budget and duration

₹1,500–2,000/day on the India ad set, ₹1,000/day on diaspora, run **at least 72 hours**. A one-day test tells you almost nothing — Meta's learning phase alone eats the first 24 hours. If you can only afford one day, run India only and treat it as directional.

### Targeting — India ad set

- Locations: Gurugram, South Delhi, Noida, Dwarka. Pin-drop the premium pockets (Golf Course Road, DLF phases, Noida 128/150, Vasant Kunj) rather than blanket-targeting the city.
- Age 30–65, all genders. **Do not exclude men.** In many households the man books and pays, the woman decides.
- Interests: Hindu temples, Bhakti, ISKCON, Radha Krishna, home décor, luxury apartments.
- Language: English + Hindi.

### What you're actually measuring

Not CPC. Three things, in order:

1. **Which angle gets thumb-stop** — CTR by creative. Convenience vs craft vs circular. This tells you what the brand is really about.
2. **Which angle gets a WhatsApp message** — the only number that matters. Track it by asking every enquiry "what did you see?" or use a distinct wa.me link per creative.
3. **What people say in the comments.** Read every one. If the objection is "I'd never let someone touch my idol", you learned the most valuable thing possible for ₹3,000 — and the answer is already on the site.

### Success bar for a 72-hour test

Rough, and my estimate rather than a benchmark: 25–40 WhatsApp enquiries and 5–10 people asking to book means the demand is real. Under 10 enquiries means the angle is wrong, not that the business is — retest with the winning creative and a sharper offer before concluding anything.

---

## 5. What I'd do next, in order

1. Register the domain and clear the trademark. Nothing else matters until that's done.
2. Replace the WhatsApp number, wire the form, add the pixel. One hour of work.
3. Shoot five real photos. Your own mandir at 7am will do.
4. Run the 72-hour test.
5. Sell 30 subscriptions by hand in one locality before hiring anyone.
6. Write the "old deity clothes" article. It's your SEO moat and your brand story in one.

---

*Prices, market estimates and performance expectations in this document are working assumptions, not researched benchmarks. Competitor findings are from public web search on 30 August 2026 and reflect what is findable online, not the whole market.*
