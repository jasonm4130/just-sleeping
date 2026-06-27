# They're Just Sleeping — Design Spec

**Date:** 2026-06-27
**Domain:** theyrejustsleeping.com (already in Cloudflare)
**Repo:** `~/Work/Git/just-sleeping`
**Status:** Approved scope, pending spec review → implementation plan

---

## 1. Concept

A single-page vintage "zine" website. Dark-humour premise: small animals photographed mid-"sleep" — *"they're just sleeping :)"*. Paper-collage cards on a dark ground, film-grain texture, typewriter + handwritten + heavy-display type, a red accent. Three small interactions: poke a crab, hover specimen cards to "wake" them, and a "quiet hours" night-mode toggle.

Source design: Claude Design project `497763f3-...` (`They're Just Sleeping.dc.html`), authored as a `.dc.html` DCLogic component. We port its visuals and logic to a static Astro site; we do **not** keep the DCLogic runtime.

## 2. Goals & non-goals

**Goals**
- Faithful port of the design's aesthetic and three interactions.
- Use the real photo library (214 photos, 968 MB) without bloating the repo or the build.
- TypeScript + Biome, no CSS framework, clean/maintainable CSS structure.
- Deploy to Cloudflare as a static site, on the apex domain, effectively free.

**Non-goals (YAGNI)**
- No SSR / Astro adapter (pure static output).
- No CMS, no newsletter, no shop (the footer literally says so).
- No sitemap (single page), no view transitions, no analytics, no MDX/content-collections.
- No Cloudflare Images / on-the-fly transforms (images are known and static).

## 3. Content model — Hybrid (featured + archive)

The design ships 6 hand-named "specimen" cards with custom wake-up lines; the library has 214 photos. Resolution:

- **Featured specimens (~6–12):** named cards with a caption (`species · location`) and a wake-line, matching the design. Seeded in a data file from the design's existing six (Kevin, Mr. Toad, Beverley, The Twins, Gerald, Patch) plus **Gary** the crab (hero). Photo assignments start as placeholders; Jason swaps in the real keepers.
- **The Archive (all ~214):** a denser grid below, light auto-captions (e.g. `Specimen No. 042`), lazy-loaded thumbnails. Auto-loaded from the photos directory — no per-photo authoring.

**Data:** `src/data/specimens.ts` — `{ photo, name, caption, wakeLine }[]` for featured. Archive derives from `import.meta.glob('/src/photos/archive/*')`.

**Hero image (Gary):** pulled from the design project (`assets/gary.jpg`) unless Jason picks a real crab from the set.

## 4. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Astro 6**, static output, **no adapter** | No SSR needed |
| Language | **TypeScript**, `astro/tsconfigs/strict` | `astro check` typechecks `.astro` + TS |
| Lint/format | **Biome 2.4** (primary) | `prettier-plugin-astro` fallback for the template only if needed |
| CSS | **Scoped `<style>` + CSS custom properties** | No Tailwind — bespoke art direction |
| Images | **`astro:assets`** build-time Sharp → AVIF + WebP | No CF Images / cdn-cgi |
| Host | **Cloudflare Workers Static Assets** (assets-only) | Pages is frozen; Workers is the forward path |
| Domain | Apex custom domain via `routes` + `custom_domain: true` | www → apex redirect optional |
| Deploy | **Local `wrangler deploy`** first; Workers Builds CI optional | — |
| Pkg manager | **pnpm 11** | — |

**Why these and not the alternatives** (from research, cited in §11): Cloudflare officially says *"start with Workers"* for new static sites — static-asset requests don't run Worker code, so the site is free and unmetered (free-tier file cap 20,000; our pipeline emits ~1,200–1,900). Tailwind is the wrong tool for one-off aesthetics (grain opacity, collage rotations) — it becomes arbitrary-value class soup. Build-time Sharp beats CF Images/cdn-cgi because the 214 images are known and static, so runtime transforms are pure waste.

## 5. CSS architecture (no framework)

**Pattern: two-tier tokens + global base + component-scoped local styles.** Components consume **only** semantic tokens; everything shared is global.

```
src/styles/
  tokens.css   # primitives (fixed) + semantic aliases + [data-theme="night"] overrides   (unlayered)
  global.css   # @layer reset, base, utilities; reset; @font-face; ALL 6 @keyframes; .u-grain, .u-container, .sr-only
```

- **Imported once, first**, in `Layout.astro` frontmatter (`import "../styles/global.css"`) → lowest precedence, so component scoped styles override cleanly.
- **Two-tier tokens:** primitives (`--red-600`, `--paper`, `--ink-900`, `--bg-900`) never change; semantic aliases (`--color-surface/-card/-ink/-accent`) are what components use; night-mode re-maps **only** semantics under `:root[data-theme="night"]`.
- **The keyframe trap (load-bearing):** the six animations (`tjsDrift/Breathe/Pop/Fade/Wob/Flicker`) are reused across Hero + cards. Astro scopes keyframes per-component and only ships scoped CSS where a component renders → a scoped keyframe silently stops animating. **All shared `@keyframes`, `@font-face`, and the grain texture live in `global.css`.**
- **`@layer reset, base, utilities`** — 3-line insurance so the reset can't out-specify real styles. Astro scoped styles are unlayered and always win. No full ITCSS.
- **Native CSS nesting** — one level deep, always `&`, avoid comma-parent selectors (`:is()` specificity trap).
- **`define:vars`** — push per-card rotation and the poke count from JS frontmatter into scoped CSS, instead of inline `style=` soup. (`define:vars` is the one attribute that does *not* force `is:inline`, so the style stays scoped.)

**Rule of thumb:** primitives never change; a theme re-maps semantics; components touch only semantic tokens. Reaching for a global class to style one component's need → scope it instead.

## 6. Image pipeline

1. **Pre-shrink once** (`scripts/shrink.ts`, Sharp): resize the 968 MB originals to ~2000px max-edge JPEGs into `src/photos/`. Cuts committed sources to ~40–60 MB and slashes build time (Sharp processes 2000px, not 4032px). 968 MB masters stay in `~/Downloads/Just Sleeping`, out of git.
2. **Source location:** `src/photos/` (processed/hashed/optimized). Never `public/` (served as-is, unoptimized).
3. **Load programmatically:** `import.meta.glob('/src/photos/archive/*.{jpg,jpeg}', { eager: true })` — no 214 manual imports. Explicit imports for the handful of featured photos.
4. **Render:**
   - Featured → `<Picture formats={['avif','webp']} widths={[640,1280,1920]} sizes=...>`.
   - Archive thumbnails → `<Image layout="constrained" width={400}>` (Astro adds `loading="lazy"`, `decoding="async"`, and width/height to prevent layout shift).
5. **Formats:** AVIF + WebP only (drop JPEG fallback — every 2026 target supports WebP).
6. **`astro.config`:** `image.layout: 'constrained'`, `image.responsiveStyles: true`, Sharp `limitInputPixels: false` (full-res phone photos).
7. **Output:** ~1,200–1,900 files — far under Cloudflare's 20,000 free-tier cap.
8. **LQIP/blur:** skipped initially (not native to Astro). Add only if a real perceived-load problem is measured.

**Build-time caveat:** a **cold** build of 214 photos is **5–20 min** (AVIF-dominated). A **warm** build is seconds **iff** `node_modules/.astro` (Astro's image cache) is preserved. Locally this is automatic; **in CI it must be explicitly cached** — highest-value setup step. Bump `NODE_OPTIONS=--max-old-space-size=4096` if encoding OOMs.

## 7. Interactivity port (minimal JS)

| Design behaviour | Port |
|---|---|
| Hover specimen card → "wake" speech bubble | **Pure CSS** `:hover` + the `tjsPop` keyframe. No JS. |
| Night-mode ("quiet hours") toggle | Flip `document.documentElement.dataset.theme`; persist to `localStorage`; CSS tokens do the rest. Inline head script sets initial theme to avoid flash. |
| Poke Gary counter + rotating lines | Tiny script: increment, swap line text, persist count to `localStorage`. |

JS total: night-mode + poke counter (a few lines each). Breathing/drift/grain are CSS.

## 8. Project structure

```
just-sleeping/
  astro.config.mjs        # static output, image config
  wrangler.jsonc          # assets-only (no main); directory ./dist
  biome.json              # Biome 2.4; ignores dist/.astro/.wrangler
  tsconfig.json           # extends astro/tsconfigs/strict
  package.json            # pnpm scripts
  scripts/shrink.ts       # one-time originals → src/photos resizer
  src/
    layouts/Layout.astro  # imports global.css first; <head>; font preload; data-theme; <slot/>
    pages/index.astro     # composes the sections
    components/
      Hero.astro          # Gary + poke counter
      Faq.astro
      SpecimenCard.astro  # define:vars rotation; hover-wake (CSS)
      FeaturedGrid.astro
      ArchiveGrid.astro   # import.meta.glob the 214
      Footer.astro
      NightToggle.astro   # data-theme flip + localStorage
    data/specimens.ts     # featured card data
    photos/
      featured/           # ~6–12 hero/featured sources
      archive/            # ~214 pre-shrunk sources
    styles/
      tokens.css
      global.css
  public/
    _headers              # immutable cache for /_astro/*
    robots.txt
    favicon.svg
    og.png                # social share image
  docs/2026-06-27-theyrejustsleeping-design.md
```

## 9. Hosting & deploy

**`wrangler.jsonc`** (assets-only, no Worker script):
```jsonc
{
  "name": "theyrejustsleeping",
  "compatibility_date": "2026-06-27",
  "assets": { "directory": "./dist", "not_found_handling": "404-page" },
  "routes": [{ "pattern": "theyrejustsleeping.com", "custom_domain": true }]
}
```
- **`public/_headers`:** `/_astro/*` → `Cache-Control: public, max-age=31536000, immutable` (content-hashed assets). HTML keeps Cloudflare's revalidating default.
- **Custom domain:** apex via `routes` + `custom_domain: true` (Cloudflare auto-creates DNS + cert). Delete any conflicting `theyrejustsleeping.com` CNAME first. `www` is separate — add a www→apex redirect if wanted.
- **Deploy:** `pnpm build && wrangler deploy` locally to start. Optionally connect the repo to **Workers Builds** later (supports assets-only projects; **must cache `node_modules/.astro`** for fast builds). Requires Wrangler ≥ 4.34.

## 10. Tooling config

**`package.json` scripts:**
```jsonc
{
  "dev": "astro dev",
  "build": "astro check && astro build",
  "preview": "astro preview",
  "check": "astro check",
  "format": "biome format --write .",
  "lint": "biome check --write .",
  "shrink": "tsx scripts/shrink.ts",
  "deploy": "astro build && wrangler deploy"
}
```

**`biome.json` strategy:** Biome 2.4 handles `.ts/.js/.json/.css` (production-grade). Enable experimental `.astro` support (`html.experimentalFullSupportEnabled: true`) and smoke-test on the real `index.astro`; if template formatting misbehaves, fall back to `prettier-plugin-astro` for `*.astro` only and have Biome skip `.astro`. Ignore `dist/`, `.astro/`, `.wrangler/` (Biome respects `.gitignore` by default).

**`.gitignore`:** `node_modules/`, `dist/`, `.astro/`, `.wrangler/`, `.env`, `.DS_Store`. (968 MB master photos are never committed; pre-shrunk `src/photos/` is.)

**Extras worth it:** `favicon.svg`, `og.png` (static), `robots.txt`. **Skipped:** sitemap, view transitions, analytics.

## 11. Open content tasks (Jason-driven, not blocking)

- Pick which photos are the featured specimens; assign to the design's names + wake-lines in `specimens.ts`.
- Decide Gary's hero image (design's `gary.jpg` vs a real crab).
- Provide/confirm `og.png` and `favicon.svg` (can start with text-based placeholders).

## 12. References

**Cloudflare hosting:** [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) · ["start with Workers" blog](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/) · [Astro on Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/) · [static-asset headers/`_headers`](https://developers.cloudflare.com/workers/static-assets/headers/) · [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) · [platform limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets) · [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)

**Images:** [Astro images guide](https://docs.astro.build/en/guides/images/) · [astro:assets reference](https://docs.astro.build/en/reference/modules/astro-assets/) · [dynamically importing images](https://docs.astro.build/en/recipes/dynamically-importing-images/) · [CF Images pricing](https://developers.cloudflare.com/images/pricing/)

**Tooling:** [Astro TypeScript](https://docs.astro.build/en/guides/typescript/) · [Biome v2.3](https://biomejs.dev/blog/biome-v2-3/) / [v2.4](https://biomejs.dev/blog/biome-v2-4/) · [Biome language support](https://biomejs.dev/internals/language-support/) · [astro-tips Biome](https://astro-tips.dev/tips/biome/)

**CSS architecture:** [Astro styling guide](https://docs.astro.build/en/guides/styling/) · [directives (`is:global`, `define:vars`)](https://docs.astro.build/en/reference/directives-reference/) · [MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer) · [caniuse CSS nesting](https://caniuse.com/css-nesting) · [CUBE CSS](https://cube.fyi/) · [native nesting gotchas](https://kilianvalkhof.com/2023/css-html/the-gotchas-of-css-nesting/)
