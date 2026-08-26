# Santo Global Advisory

Multilingual Hugo site for Santo Global Advisory.

The site is generated from Hugo templates, translated content files, shared data files, and a small progressive-enhancement JavaScript layer.

## Requirements

- Hugo Extended
- GNU Make

Check your Hugo installation with:

```bash
hugo version
```

## Development

Start the local server:

```bash
make start
```

Build the production site:

```bash
make build
```

Clean generated output:

```bash
make clean
```

## Available Make Targets

- `make start` runs `hugo server`
- `make start-watch` aliases `make start`
- `make watch` aliases `make start`
- `make build` generates the site into `public/`
- `make clean` removes generated Hugo output

## Project Structure

- [`config/_default/`](./config/_default/) Hugo configuration and per-language menus
- [`content/`](./content/) page-level multilingual content files
- [`data/`](./data/) shared structured content such as personas, services, pathways, and FAQs
- [`i18n/`](./i18n/) short translated UI strings
- [`layouts/`](./layouts/) Hugo templates and partials
- [`assets/scss/`](./assets/scss/) site styles
- [`assets/js/`](./assets/js/) progressive-enhancement JavaScript

## Editing Content

Page copy lives in language-specific markdown files:

- [`content/_index.en.md`](./content/_index.en.md)
- [`content/_index.fr.md`](./content/_index.fr.md)
- [`content/_index.pt.md`](./content/_index.pt.md)

Structured repeated content is stored in shared data files keyed by language, for example:

- [`data/services.yaml`](./data/services.yaml)
- [`data/personas.yaml`](./data/personas.yaml)
- [`data/faq_categories.yaml`](./data/faq_categories.yaml)

Short UI labels such as button and navigation text live in:

- [`i18n/en.toml`](./i18n/en.toml)
- [`i18n/fr.toml`](./i18n/fr.toml)
- [`i18n/pt.toml`](./i18n/pt.toml)

## Languages and Routes

`defaultContentLanguageInSubdir` is enabled, so every language lives in its own
subdirectory and `/` is a redirect rather than a route:

- English: `/en/` (`/` redirects here)
- French: `/fr/`
- Portuguese: `/pt/`

Each language carries the same four section routes:

- `/<lang>/services/`
- `/<lang>/faq/`
- `/<lang>/guides/` and `/<lang>/guides/<slug>/`
- `/<lang>/partners/` and `/<lang>/partners/<slug>/`

Section paths are identical in every language; only individual page slugs are
localised. `/en/guides/cpf-for-foreigners-in-brazil/` is
`/pt/guides/cpf-para-estrangeiros-no-brasil/` in Portuguese. Translations are
linked by a shared `translationKey` in front matter, which is what makes the
language switcher and the `hreflang` tags resolve across differing slugs.
