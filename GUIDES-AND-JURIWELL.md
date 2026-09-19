# SGA Guides + Juriwell integration — what shipped, what's next

Written 2026-08-21, updated 2026-09-19 (standalone release + re-enable runbook: sections 6 and 7).
Source content: `Move to Brazil — A Practical Relocation Guide for Foreigners`
(Santo Global Advisory, 2026 edition, 32 chapters).

---

## 1. What shipped

**36 SEO articles** — 12 topics × EN / FR / PT-BR, each with localised slugs, `translationKey`
cross-linking, FAQ schema, key-facts sidebar, official-source list, and a Juriwell email-capture CTA.

| # | Guide key | Intent | Maps to SGA service |
|---|---|---|---|
| 1 | `digital-nomad-visa` | High — transactional | Visa & residency strategy |
| 2 | `retirement-visa` | High — transactional | Visa & residency strategy |
| 3 | `investor-visa` | High — highest value | Investment & real estate |
| 4 | `tax-residency` | High — the money page | Tax structuring & compliance |
| 5 | `cpf` | Medium — huge volume | CPF & legal registration |
| 6 | `banking` | Medium | Banking & initial setup |
| 7 | `cost-of-living` | Low — top of funnel | (lead magnet) |
| 8 | `buying-property` | High | Real estate support |
| 9 | `rural-land` | High — near-zero competition | Real estate support |
| 10 | `contracts` | Medium | Post-arrival support |
| 11 | `choosing-city` | Low — top of funnel | (lead magnet) |
| 12 | `first-30-days` | Low — top of funnel | (lead magnet) |

**Infrastructure added:**

- `layouts/guides/list.html`, `layouts/guides/single.html` — section index + article template
- `layouts/partials/guide-cta.html` — the email-capture block
- `layouts/partials/guide-schema.html` — `Article` + `FAQPage` JSON-LD
- `data/juriwell.yaml` — integration config + CTA copy in three languages
- `layouts/partials/head.html` — **rewritten**: canonical, hreflang (incl. `x-default`), Open Graph, Twitter cards
- `layouts/partials/header.html` — patched so a menu entry can carry `params.page` (a real page link, not a home anchor)
- `config/_default/menus.{en,fr,pt}.toml` — "Guides" / "Guias" nav entry, weight 5
- `config/_default/hugo.toml` + `config.toml` — TOC config (h2–h3), goldmark `unsafe` (for the callout divs), sitemap config
- `assets/scss/main.scss` — guide + CTA styles appended, using only existing design tokens
- `assets/js/main.js` — `setJuriwellForms()` handler
- `i18n/{en,fr,pt}.toml` — 12 new keys

**Verified:** `hugo` builds clean; hreflang (`x-default` → English) and the language switcher resolve across
localised slugs; per-language sitemaps carry 16 URLs each; all JSON-LD parses; no broken internal links;
JS passes `node --check`.

---

## 2. How the CTA works today

**The Juriwell CTA is off by default** (`enabled: false` in `data/juriwell.yaml`). While off, the
`guide-cta.html` partial renders nothing, and every guide and the guides index end with the site's standard
`final-cta` block (book a consultation + WhatsApp + contact strip). No Juriwell backend is needed, nothing is
captured, and no built page references Juriwell. **The guides can merge and deploy on their own.**

Switch to the Juriwell form only when Tracks A + C1 are live: set `enabled: true` (then fill `endpoint`).
Re-check the form copy first — it currently promises a guide by email (B1) and AI answers (C4).

The rest of this section describes the Juriwell mode (`enabled: true`):

```
Reader hits any guide
  └─ scrolls to "Get Move to Brazil — the full 32-chapter guide"
       └─ enters email, submits
            ├─ POST {endpoint} {email, service, source: "sga-guide-<topic>", message}
            └─ window.open("{welcome_url}?topic=<topic>&lang=<xx>&ref=sga")
```

Configured in `data/juriwell.yaml`:

```yaml
endpoint: ""                                                   # ← empty = network call skipped
welcome_url: "https://juriwell.com/welcome/santo-global-advisory"
referral: "sga"
source_prefix: "sga-guide"
```

**`endpoint` is deliberately empty.** With it empty the form still opens the Juriwell welcome page,
so the flow never dead-ends while the backend work below is pending. Fill it in and the POST starts firing.

Design decisions worth knowing:

- **Honeypot field** (`.jw-trap`) — bots fill it, submission silently drops. Client-side only; see gap #6.
- **`window.open` fires inside the submit handler** so popup blockers still count it as user-initiated;
  falls back to same-tab navigation if blocked.
- **Topic travels in `source`, not `service`** — because Juriwell clamps `service` to `tax|immigration|other`
  (see gap #2). Every lead arrives tagged `sga-guide-retirement-visa`, `sga-guide-rural-land`, etc.

---

## 3. Juriwell-side work required — ordered, because they block each other

### Track A — make SGA leads land in SGA's tenant *(blocking, do first)*

- **A1. Public leads endpoint hardcodes the wrong firm** | TLDR: `backend/internal/leads/lead_handler.go`
  sets `FirmID: "default"` on every unauthenticated submission — the code comment literally says
  *"Production would route by domain/slug."* Every SGA lead lands in the `default` tenant, invisible to
  Jonathan's CRM. Fix: route by `Origin`/`Referer` header, a `?firm=` slug, or a per-firm public API key.
  ~half a day. **Nothing else in this plan is worth doing until this is done.**
- **A2. CORS allowlist** | TLDR: `backend/cmd/server/main.go:187` reads `CORS_ORIGINS`, defaulting to
  `localhost:5173`. `https://santoglobaladvisory.com` must be added or the browser blocks the POST
  before it leaves the page. ~10 minutes, but it is an env/Helm change, not a code change.
- **A3. Rate-limit `POST /leads`** | TLDR: `limiter` middleware is wired to `/auth/*` only
  (`backend/internal/auth/handlers.go:188-190`); the public lead endpoint has none. An unauthenticated
  write endpoint on a public domain needs one. ~1 hour.

### Track B — actually deliver the free guide *(independent of Track C)*

- **B1. Lead-facing email** | TLDR: today `leadService.Submit` enqueues *one* email — an alert to a single
  global admin mailbox. The person who gave you their address gets nothing. Add a second `mailout.Enqueue`
  with a new `mailtmpl` template, localised EN/FR/PT, carrying the PDF link. ~1 day.
- **B2. Host the PDF** | TLDR: serve it from the S3-compatible layer (`backend/internal/storage/`) behind a
  signed, expiring URL rather than a public static file — otherwise the link circulates and the email
  capture stops being a capture. ~half a day.
- **B3. Double opt-in** | TLDR: not optional if any reader is in the EU, and the FR guides guarantee some
  will be. Confirm-then-deliver, and log consent against the lead row. ~1 day.

### Track C — Jonathan's Juriwell office page *(the thing you described)*

- **C1. Route** | TLDR: `frontend/src/routes/welcome/[firm]/+page.svelte`, reading `?topic=&lang=&ref=`.
  Juriwell's routes are flat and Svelte 5 runes-only — `$props()`, `$derived`, `onclick`, no `on:`.
  Firm branding comes from the `firms` domain; article content can come from the existing
  `GET /articles/public` + `/articles/public/:slug` endpoints, which are already unauthenticated. ~2 days.
- **C2. Copy, in Jonathan's voice** | TLDR: the page you described —
  *"Welcome to my office. I use Juriwell because it lets me stay in touch with the people I advise and
  answer properly, instantly, with AI behind it. Connect to learn more about **{topic}** and ask me anything."*
  `{topic}` is the `?topic=` param resolved to a human-readable phrase per language. Every guide already
  carries `juriwell_topic` and `juriwell_topic_key` in its front matter — the mapping table is done, just
  needs porting into the Svelte route.
- **C3. Account creation from the page** | TLDR: `POST /invitations` is auth-gated and role-based, so a
  cold visitor cannot use it. Either extend it with a firm-scoped public self-serve variant, or point the
  CTA at `/register` pre-filled with the firm and referral. The second is far cheaper and ships this week.
  ~half a day vs ~2 days.
- **C4. "Ask me anything" is not built** | TLDR: `backend/internal/llm/` exists but the three planned agents
  (Data Intern, Executive Secretary, Legal Assistant) are not wired in. Until they are, the page should
  promise what actually works today — direct messaging with Jonathan via `conversations`/`messages`, which
  *is* built — and not promise instant AI answers. Shipping the AI claim before the AI is a trust problem,
  not a marketing one.

---

## 4. SGA-site hints, in rough priority order

**Do these — cheap, and they compound**

- **Publish `robots.txt` + submit the sitemap** | TLDR: `enableRobotsTXT = true` is already set and per-language
  sitemaps generate correctly. Submit `https://santoglobaladvisory.com/sitemap.xml` to Google Search Console
  and Bing. Nothing below matters until the pages are indexed. ~30 min.
- **Add an OG image** | TLDR: `head.html` emits `og:title`/`og:description` but no `og:image`, so every
  WhatsApp and LinkedIn share renders as a grey box. One branded 1200×630 template with the guide title
  overlaid would do it. ~2 hours.
- **~~Link the guides from the homepage~~** | Done: `layouts/index.html` has a `#guides` section (commit `281f052`).
- **Cross-link from `/services/` and `/faq/`** | TLDR: `data/service_details.yaml` and `data/faqs.yaml` both
  discuss topics that now have a dedicated 1,500-word page behind them. Internal links from high-authority
  pages to new ones is the cheapest ranking lever you have. ~2 hours.

**Consider — real upside, real effort**

- **Per-guide consultation pricing** | TLDR: the `consultation_section` is generic across the site. A reader
  who just finished the rural-land guide has a very different willingness to pay than one who finished
  cost-of-living. Segmenting the CTA by guide would likely move booking rate more than any content change. ~1 day.
- **A `dateModified` discipline** | TLDR: the guides cite live figures — US$1,500, US$2,000, R$1,000,000,
  R$700,000, 184 days, 25% municipal cap. Those *will* move. Set a calendar reminder to re-verify against
  gov.br each quarter and bump `lastmod`; the JSON-LD already surfaces it, and freshness on
  "requirements" queries is worth real positions.
- **PT-BR is aimed at a different reader than EN/FR** | TLDR: the Portuguese versions are currently faithful
  translations of guidance written for someone *outside* Brazil looking in. A Brazilian searching in
  Portuguese is more often the spouse, the accountant, or the broker of a foreigner. Worth a second pass
  reframing PT toward that reader rather than translating the foreigner's-eye view. ~1 day.

**Don't do these**

- **Don't add more guides yet.** Twelve is enough surface to learn from. Ship, measure which ones convert,
  then expand into the winners' neighbours. Writing 12 more before the first 12 have data is guessing twice.
- **Don't set `endpoint` in `juriwell.yaml` before Track A1 lands.** You would be posting real leads into
  the wrong tenant, where nobody is watching, and they are not recoverable into SGA's pipeline afterwards.
- **Don't promise AI answers on the welcome page until C4 is real.** See above.
- **Don't chase "moving to Brazil" as a head term.** It is dominated by relocation-services aggregators with
  budgets you are not going to outspend. The value here is the long tail — `RN 36`, `módulo de exploração
  indefinida`, `184 days tax residency Brazil` — where SGA has actual expertise and the competition has none.

---

## 5. Editorial notes on the content itself

- **Every figure traces back to the book**, which states it was verified against gov.br for the 2026 edition.
  Nothing was invented, and no figure was rounded or "improved."
- **The April 2026 STF ruling** on Lei 5.709/1971 appears in the rural-land guides in all three languages.
  It is the single most current, least-covered fact in the whole set — the strongest ranking asset here.
- **Voice matches the book**: the `A QUESTION WORTH ASKING` / `BEFORE YOU MAKE THIS DECISION` callouts are
  carried over as `.callout` / `.callout warn`, and the pull-quotes are the book's own lines.
- **Every guide ends by naming when counsel is actually needed** rather than implying counsel is always
  needed. That is both the book's position and, commercially, the more credible one.
- **Disclaimer renders on every guide** from `i18n` (`guide_disclaimer_title` / `guide_disclaimer_body`),
  mirroring the book's back matter.

---

## 6. Release log — guides shipped standalone (2026-09-19)

The Juriwell backend was not live, which blocked merging the guides. The guides themselves never depended
on it — only the CTA at the bottom of each one did — so the CTA was made switchable and shipped **off**.

| Step | What | Where |
|---|---|---|
| 1 | Guides section, 36 articles, head/SEO rewrite, Juriwell CTA (`endpoint` empty) | PR #1, commit `587138d` |
| 2 | `enabled` flag in `data/juriwell.yaml`, default `false`; `guide-cta.html` renders nothing when off, so guides end with the standard `final-cta` block (consultation + WhatsApp) | commit `c1d7ae6`, PR #2 (merge `1ba020d`) |
| 3 | Review fixes (below) | same commit |
| 4 | Deployed to production | `gh-pages` commit `b2c0e13`, live at https://santoglobaladvisory.com |

**Why the fallback is "render nothing" and not a custom block.** A dedicated consultation + WhatsApp block was
tried first. It rendered directly above `final-cta` with identical buttons and targets, so it was removed.
The original "empty endpoint" behaviour was not safe to ship either: it showed "Check your inbox" although
nothing was sent or stored, and opened a welcome page that does not exist yet (404).

**Bugs found in review and fixed (`c1d7ae6`)**
- `x-default` hreflang pointed at each page's own language, so the three languages each claimed to be the
  default. It now points at the default content language (English): `hugo.Sites.Default.Language.Lang` in
  `layouts/partials/head.html`.
- The "Reviewed <month year>" line on guides was English on FR/PT pages. `layouts/guides/single.html` now uses
  `time.Format`, which localises the month.
- `window.open(url, "_blank", "noopener")` always returns `null`, so the Juriwell form would have opened the
  welcome page in a new tab *and* navigated the current tab. `assets/js/main.js` now calls
  `window.open(url, "_blank")` and sets `opener = null`. (Only matters when Juriwell mode is on; verified by
  reading the spec, not in a browser.)

**Verified on the built site before deploying**
- Guides: 36 article pages (12 topics × EN/FR/PT) plus a guides index per language, each index listing 12 cards.
- All 72 JSON-LD blocks parse; no broken internal links; per-language sitemaps list 16 URLs.
- No built page references Juriwell while the flag is off.
- Live (curl, after deploy): guide pages return 200, FR date reads "août 2026", `x-default` is English.

**Known and deliberately left alone**
- About 30 meta descriptions exceed 200 characters and may be truncated in search results. Editorial, not a bug.
- `site.Data` triggers a Hugo deprecation warning (`hugo.Data` is the replacement). The rest of the site uses the
  same form, so it was kept consistent; migrate everything together.
- No `og:image` yet (section 4). Article facts were not re-checked against gov.br in this pass.
- Search Console / Bing submission of the sitemap has not been done from this repo.

### How to deploy (any time)

`deploy.sh` builds `config.toml` with `--minify` into a temporary worktree of the local `gh-pages` branch,
copies `CNAME`, commits, and pushes.

```sh
git checkout main && git pull --ff-only origin main
git fetch origin
git log --oneline origin/gh-pages..gh-pages     # must print nothing (no local-only commits)
git branch -f gh-pages origin/gh-pages          # only if local gh-pages is behind, else the push is rejected
./deploy.sh
```

Then verify with `curl` (the `gh` CLI is not installed on this machine):

```sh
u=https://santoglobaladvisory.com
curl -s -o /dev/null -w "%{http_code}\n" $u/en/guides/
curl -s $u/fr/guides/ | grep -o 'hreflang=x-default href=[^> ]*'    # expect .../en/guides/
```

Published HTML is minified, so attributes are unquoted (`class=guide-card`, not `class="guide-card"`).

---

## 7. Putting Juriwell back — runbook

**Do not start until these are true** (details in section 3):

- [ ] **A1** public `POST /leads` routes to SGA's firm, not the hardcoded `default` tenant. Leads sent before
      this are not recoverable into SGA's pipeline.
- [ ] **A2** `https://santoglobaladvisory.com` is in the backend's `CORS_ORIGINS`, or the browser blocks the POST.
- [ ] **A3** `POST /leads` is rate-limited.
- [ ] **C1** the page at `welcome_url` exists (otherwise readers land on a 404).
- [ ] Copy matches reality: if **B1** (guide email) is not built, the guide-delivery wording is untrue; if **C4**
      (AI agents) is not built, the AI wording is untrue.

**1. Edit `data/juriwell.yaml`**

```yaml
enabled: true
endpoint: "https://<juriwell-api-host>/leads"   # must return 2xx; the form treats any non-2xx as failure
welcome_url: "https://juriwell.com/welcome/santo-global-advisory"   # confirm it resolves
```

The form POSTs JSON `{email, service, source, message}`. `source` is `sga-guide-<topic-key>`; the topic goes in
`source` because Juriwell clamps `service` to `tax|immigration|other`.

Leaving `endpoint` empty with `enabled: true` is **not** a production state: the form reports success and opens
the welcome page but captures nothing.

**2. Review the per-language copy** in the same file (`en:`, `fr:`, `pt:`). Check especially:

- `hook` — mentions AI and quick answers (C4).
- `note` — "One email with the guide" (B1). `submit` ("Send me the guide") and `success` ("Check your inbox")
  make the same promise.
- `title` and `body` — "the full 32-chapter guide".

**3. Build and check locally** (before committing):

```sh
hugo --config config.toml --destination /tmp/juriwell-check --minify
grep -rl 'data-jw-form' /tmp/juriwell-check | wc -l    # expect 39 = 36 articles + 3 guide indexes
grep -o 'data-jw-endpoint=[^ >]*' /tmp/juriwell-check/en/guides/brazil-digital-nomad-visa/index.html
```

**4. Test in a real browser** against a build served locally or on a preview: submit a test email on one guide
and confirm (a) the request succeeds with no CORS error, (b) the lead appears in **SGA's** CRM, not `default`,
(c) the welcome page opens in a new tab and the current tab stays put (the `noopener` fix), (d) the honeypot
field silently drops a submission when filled.

**5. Ship**: commit, open a PR, merge, then follow "How to deploy" above.

**6. Verify live**: `curl -s https://santoglobaladvisory.com/en/guides/ | grep -c data-jw-form` should be `1`.
Submit one real test lead in production and confirm it lands in the right tenant.

**Rollback** (needs a merge and a deploy): set `enabled: false`, commit, merge, deploy. Guides revert to the
standard `final-cta` ending. Leads already captured stay in Juriwell.
