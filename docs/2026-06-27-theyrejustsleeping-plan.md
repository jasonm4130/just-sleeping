# They're Just Sleeping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy theyrejustsleeping.com — a single-page vintage photo-zine — as a static Astro site on Cloudflare Workers static assets.

**Architecture:** Static Astro 6 output (no adapter). Two-tier-token CSS (global stylesheet for tokens/reset/fonts/keyframes; component-scoped `<style>` for everything else). Build-time image optimization via `astro:assets` from pre-shrunk sources. Three interactions: hover-to-wake (pure CSS), night-mode and a poke counter (tiny scripts + `localStorage`). Deployed assets-only to Cloudflare.

**Tech Stack:** Astro 6, TypeScript (`astro/tsconfigs/strict`), Biome 2.4, Sharp, pnpm 11, Wrangler ≥ 4.34, Cloudflare Workers static assets.

## Global Constraints

- Package manager: **pnpm** (do not generate `package-lock.json`/`yarn.lock`).
- Node ≥ 23.6 required for native `.ts` execution (`node scripts/*.ts`, `node --test`). Local is v24.15.
- **No CSS framework.** No Tailwind. Styling = Astro scoped `<style>` + CSS custom properties.
- **All shared `@keyframes`, `@font-face`, and the grain texture live in `src/styles/global.css`** — never in a scoped component `<style>` (Astro scopes/ships them per-component → they silently break when reused).
- Components consume **only semantic tokens** (`--color-*`), never primitives.
- Image sources live in `src/photos/**` (optimized). Never `public/` (served unoptimized). The 968 MB masters in `~/Downloads/Just Sleeping` are **never committed**.
- Six animation keyframe names, verbatim from the design: `tjsDrift`, `tjsBreathe`, `tjsPop`, `tjsFade`, `tjsWob`, `tjsFlicker`.
- Palette primitives, verbatim from the design: bg `#2a2622`, paper `#ece7da`, ink `#1c1814`, accent-red `#b1453a`, card-white `#fbfaf6`.
- Fonts, verbatim: `Archivo Black` (display), `Special Elite` (body/typewriter), `Caveat` (handwritten).
- Commit messages end with: `Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq`
- Deploy (Task 10) is outward-facing (publishes the site, touches DNS) — **confirm with Jason before running it.**

**Verification primitives** used throughout:
- Typecheck: `pnpm check` → expect `0 errors`.
- Lint/format: `pnpm lint` → expect `Checked N files` with no errors.
- Build: `pnpm build` → expect `Complete!` / no error exit.
- Render: `pnpm dev` then load `http://localhost:4321/` (Playwright MCP `browser_navigate` + `browser_take_screenshot`, or eyeball) → compare to the design section.

---

### Task 1: Scaffold project, tooling, and config

Hand-rolled minimal Astro (the dir already holds `.git/` + `docs/`, so `pnpm create astro` would fight the existing contents).

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `wrangler.jsonc`
- Create: `src/pages/index.astro` (temporary placeholder)
- Modify: `.gitignore` (already has `node_modules/ dist/ .astro/ .wrangler/ .env .DS_Store` — leave as-is)

**Interfaces:**
- Produces: working `pnpm dev`/`build`/`check`/`lint` scripts; `astro.config.mjs` image service config consumed by Tasks 6–7.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "theyrejustsleeping",
  "type": "module",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "check": "astro check",
    "format": "biome format --write .",
    "lint": "biome check --write .",
    "shrink": "node scripts/shrink.ts",
    "deploy": "astro build && wrangler deploy"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm add astro
pnpm add -D @astrojs/check typescript sharp @biomejs/biome wrangler @types/node
```
Expected: installs without error; `astro`, `sharp`, `@biomejs/biome`, `wrangler` appear in `package.json`.

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://theyrejustsleeping.com',
  image: {
    layout: 'constrained',
    responsiveStyles: true,
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { limitInputPixels: false },
    },
  },
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 5: Write `biome.json`**

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!dist/**", "!.astro/**", "!.wrangler/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "html": { "experimentalFullSupportEnabled": true },
  "overrides": [
    {
      "includes": ["**/*.astro"],
      "linter": {
        "rules": {
          "correctness": { "noUnusedVariables": "off", "noUnusedImports": "off" },
          "style": { "useConst": "off", "useImportType": "off" }
        }
      }
    }
  ]
}
```

- [ ] **Step 6: Write `wrangler.jsonc`**

```jsonc
{
  "name": "theyrejustsleeping",
  "compatibility_date": "2026-06-27",
  "assets": { "directory": "./dist", "not_found_handling": "404-page" },
  "routes": [{ "pattern": "theyrejustsleeping.com", "custom_domain": true }]
}
```

- [ ] **Step 7: Write placeholder `src/pages/index.astro`**

```astro
---
---
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>They're Just Sleeping</title></head>
  <body><h1>they're just sleeping</h1></body>
</html>
```

- [ ] **Step 8: Verify build, check, lint**

Run: `pnpm check && pnpm build && pnpm lint`
Expected: `astro check` → `0 errors`; build → `Complete!` and a `dist/index.html`; Biome → no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro + TS + Biome + wrangler config

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 2: Design tokens, global stylesheet, and Layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Layout.astro`
- Modify: `src/pages/index.astro` (use the Layout)

**Interfaces:**
- Produces: `Layout.astro` (props: `{ title?: string; description?: string }`) wrapping page content in `<slot/>`; global semantic tokens `--color-surface|-card|-ink|-accent|-muted`; the six `tjs*` keyframes; `.u-grain`, `.u-container`, `.sr-only` utilities. Consumed by every later task.

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  /* PRIMITIVES — fixed, never used directly by components */
  --bg-900: #2a2622;
  --paper: #ece7da;
  --card-white: #fbfaf6;
  --ink-900: #1c1814;
  --ink-700: #211c17;
  --red-600: #b1453a;
  --tape: rgba(212, 201, 150, 0.5);

  --font-display: "Archivo Black", system-ui, sans-serif;
  --font-body: "Special Elite", "Courier New", monospace;
  --font-hand: "Caveat", cursive;

  --maxw: 880px;
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 1rem;
  --space-5: 2rem; --space-8: 4rem;

  /* SEMANTIC — the default (day) theme; components use ONLY these */
  --color-surface: var(--bg-900);
  --color-card: var(--paper);
  --color-card-inner: var(--card-white);
  --color-ink: var(--ink-900);
  --color-accent: var(--red-600);
  --color-muted: color-mix(in oklab, var(--ink-900) 55%, transparent);
}

/* NIGHT ("quiet hours") — re-map semantics only; primitives untouched */
:root[data-theme="night"] {
  --color-surface: #0c0e1a;
  --color-card: color-mix(in oklab, var(--paper) 86%, #0c0e1a);
  --color-ink: color-mix(in oklab, var(--ink-900) 88%, var(--paper) 12%);
  --color-accent: color-mix(in oklab, var(--red-600) 82%, black);
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@layer reset, base, utilities;
@import url("./tokens.css");

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  img, picture { display: block; max-width: 100%; }
  button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
}

@layer base {
  body {
    background: var(--color-surface);
    color: var(--color-ink);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    transition: background 0.5s ease;
  }

  /* All six shared animations — global so every component can reference them */
  @keyframes tjsDrift { 0% { transform: translateY(0) translateX(0) rotate(0); opacity: 0; } 12% { opacity: 0.8; } 100% { transform: translateY(-72px) translateX(14px) rotate(12deg); opacity: 0; } }
  @keyframes tjsBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.014); } }
  @keyframes tjsPop { 0% { transform: scale(0.55) translateY(10px); opacity: 0; } 55% { transform: scale(1.07) translateY(-2px); } 100% { transform: scale(1) translateY(0); opacity: 1; } }
  @keyframes tjsFade { 0% { opacity: 0; } 100% { opacity: 1; } }
  @keyframes tjsWob { 0%, 100% { transform: rotate(-0.4deg); } 25% { transform: rotate(-2deg); } 75% { transform: rotate(1.6deg); } }
  @keyframes tjsFlicker { 0%, 100% { opacity: 0.92; } 50% { opacity: 0.82; } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
}

@layer utilities {
  .u-container { max-width: var(--maxw); margin: 0 auto; padding: var(--space-8) var(--space-3) 7.5rem; }
  /* Reusable film-grain overlay; apply to a positioned element */
  .u-grain::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    mix-blend-mode: multiply; opacity: 0.32;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
}
```

- [ ] **Step 3: Write `src/layouts/Layout.astro`**

```astro
---
import "../styles/global.css";
interface Props { title?: string; description?: string; }
const {
  title = "They're Just Sleeping",
  description = "A zine of small animals having a really, really long lie-down.",
} = Astro.props;
---
<!doctype html>
<html lang="en" data-theme="day">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content="/og.png" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Special+Elite&family=Caveat:wght@500;700&display=swap" rel="stylesheet" />
    <!-- set theme before paint to avoid flash -->
    <script is:inline>
      const t = localStorage.getItem("tjs-theme");
      if (t) document.documentElement.dataset.theme = t;
    </script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 4: Point `index.astro` at the Layout**

```astro
---
import Layout from "../layouts/Layout.astro";
---
<Layout>
  <main class="u-container">
    <p style="font-family:var(--font-hand);color:var(--color-accent);font-size:2rem">tokens wired.</p>
  </main>
</Layout>
```

- [ ] **Step 5: Verify**

Run: `pnpm check && pnpm build`
Expected: `0 errors`, build `Complete!`.
Then `pnpm dev`, load `http://localhost:4321/`: dark `#2a2622` background, Caveat-font red text. Toggle theme manually in devtools console `document.documentElement.dataset.theme='night'` → background shifts to deep blue. Confirms tokens + theming + global import order.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: design tokens, global stylesheet, and Layout

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 3: Photo-shrink script (logic — real tests)

Pre-resize the 968 MB masters to ~2000px max-edge JPEGs in `src/photos/archive/`, with URL-safe names, idempotently.

**Files:**
- Create: `scripts/shrink.ts`, `scripts/shrink.test.ts`

**Interfaces:**
- Produces (importable from `scripts/shrink.ts`):
  - `targetWidth(w: number, h: number, max: number): number | null` — the width to resize to so the longest edge ≤ `max`, preserving aspect; `null` if the image is already within `max` (no upscale).
  - `sanitizeName(filename: string): string` — lowercase, spaces/parens/unsafe chars → single `-`, collapse repeats, keep extension.
  - `main(srcDir: string, outDir: string): Promise<{ written: number; skipped: number }>`

- [ ] **Step 1: Write the failing test**

`scripts/shrink.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { targetWidth, sanitizeName } from "./shrink.ts";

test("targetWidth scales the longest edge to max, preserving aspect", () => {
  // landscape 4032x3024, max 2000 -> width 2000
  assert.equal(targetWidth(4032, 3024, 2000), 2000);
  // portrait 3024x4032, max 2000 -> width 1500 (height is the long edge)
  assert.equal(targetWidth(3024, 4032, 2000), 1500);
});

test("targetWidth returns null when already within max (no upscale)", () => {
  assert.equal(targetWidth(1600, 1200, 2000), null);
  assert.equal(targetWidth(2000, 1000, 2000), null);
});

test("sanitizeName lowercases and makes URL-safe, keeping extension", () => {
  assert.equal(sanitizeName("EFFECTS(1).jpg"), "effects-1.jpg");
  assert.equal(sanitizeName("2012-11-03 13.37.46.jpg"), "2012-11-03-13-37-46.jpg");
  assert.equal(sanitizeName("PXL_20210806_031831586.MP.jpg"), "pxl-20210806-031831586-mp.jpg");
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `node --test scripts/shrink.test.ts`
Expected: FAIL — cannot find `targetWidth`/`sanitizeName` (module not implemented).

- [ ] **Step 3: Write `scripts/shrink.ts`**

```ts
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

export function targetWidth(w: number, h: number, max: number): number | null {
  const longest = Math.max(w, h);
  if (longest <= max) return null;
  return Math.round((w / longest) * max);
}

export function sanitizeName(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const stem = basename(filename, extname(filename));
  const safe = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe}${ext === ".jpeg" ? ".jpg" : ext}`;
}

export async function main(srcDir: string, outDir: string): Promise<{ written: number; skipped: number }> {
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((f) => /\.jpe?g$/i.test(f));
  let written = 0, skipped = 0;
  for (const file of files) {
    const out = join(outDir, sanitizeName(file));
    try { await stat(out); skipped++; continue; } catch { /* not built yet */ }
    const src = join(srcDir, file);
    const meta = await sharp(src).metadata();
    const tw = targetWidth(meta.width ?? 0, meta.height ?? 0, 2000);
    const pipe = sharp(src).rotate(); // respect EXIF orientation
    if (tw) pipe.resize({ width: tw });
    await pipe.jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    written++;
    console.log(`  ${file} -> ${sanitizeName(file)}${tw ? ` (w=${tw})` : " (kept size)"}`);
  }
  return { written, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const src = process.argv[2] ?? `${process.env.HOME}/Downloads/Just Sleeping`;
  const out = process.argv[3] ?? "src/photos/archive";
  const r = await main(src, out);
  console.log(`shrink: ${r.written} written, ${r.skipped} skipped`);
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `node --test scripts/shrink.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the script for real**

Run: `pnpm shrink`
Expected: writes ~214 files into `src/photos/archive/`; final line `shrink: 214 written, 0 skipped`. Re-running prints `0 written, 214 skipped` (idempotent).
Verify size: `du -sh src/photos/archive` → expect ~40–60 MB (vs 968 MB source).

- [ ] **Step 6: Commit**

```bash
git add scripts/ src/photos/archive
git commit -m "feat: photo-shrink script + shrunk archive sources

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 4: Hero section

**Files:**
- Create: `src/components/Hero.astro`, `src/photos/featured/gary.jpg` (placeholder — copy any archive photo for now; Jason swaps the real crab)
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Layout`, semantic tokens, `tjsBreathe`/`tjsDrift`/`tjsFlicker`/`tjsWob` keyframes.
- Produces: `<Hero />` (no props). Contains the poke-target markup with `id="poke"`, `id="poke-line"`, `id="poke-count"` consumed by Task 8.

- [ ] **Step 1: Seed the hero image placeholder**

Run: `cp src/photos/archive/augustus1.jpg src/photos/featured/gary.jpg` (creates `featured/`; any photo works as a stand-in).

- [ ] **Step 2: Write `src/components/Hero.astro`**

Port the design's hero: paper card (rotated, grain via `.u-grain`), `Est.` byline, the `DECEASED`/`just sleeping :)` stamp, the three-line `Archivo Black` headline, the intro paragraph, and Gary's framed `<Picture>` with the grayscale film look + drifting `z`/`Z`/`z`. Use the design's exact copy. Scoped `<style>` for layout; tokens for colour; `define:vars` not needed here.

```astro
---
import { Picture } from "astro:assets";
import gary from "../photos/featured/gary.jpg";
---
<section class="hero u-grain" aria-labelledby="hero-title">
  <div class="tape tape-l"></div>
  <div class="tape tape-r"></div>
  <div class="byline">
    <span>Est. whenever &nbsp;·&nbsp; Issue ∞</span>
    <span class="stamp">
      <span class="deceased">DECEASED</span>
      <span class="sleeping">just sleeping :)</span>
    </span>
  </div>
  <h1 id="hero-title">They're<br />just<br />sleeping</h1>
  <p class="intro">A zine of small animals having a really, <em>really</em> long lie-down. We photograph them. We do not wake them. That would be rude.</p>
  <div class="gary-row">
    <figure class="gary" id="poke">
      <div class="frame">
        <Picture src={gary} formats={["avif", "webp"]} widths={[300, 600]} sizes="300px" alt="a crab, resting" />
      </div>
      <figcaption>this is Gary. he's fine.<br /><span>resting his eyes. and his everything.</span></figcaption>
      <span class="z z1">z</span><span class="z z2">Z</span><span class="z z3">z</span>
    </figure>
    <div class="poke-col">
      <div class="poke-arrow">↙ poke him</div>
      <p id="poke-line" class="poke-line">psst — go on, poke him. he won't mind.</p>
      <p class="poke-tally">pokes logged: <span id="poke-count">0</span></p>
    </div>
  </div>
</section>

<style>
  .hero { position: relative; background: var(--color-card); padding: 3.4rem 3rem 4rem; box-shadow: 0 26px 60px -20px rgba(0,0,0,.65), 0 2px 0 rgba(0,0,0,.2); transform: rotate(-0.5deg); }
  .tape { position: absolute; height: 30px; background: var(--tape); mix-blend-mode: multiply; box-shadow: 0 1px 6px rgba(0,0,0,.18); }
  .tape-l { top: -15px; left: 46px; width: 128px; transform: rotate(-4deg); }
  .tape-r { top: -13px; right: 60px; width: 108px; transform: rotate(3deg); }
  .byline { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; opacity: .7; }
  .stamp { position: relative; transform: rotate(-7deg); }
  .deceased { border: 2.5px solid var(--color-accent); color: var(--color-accent); font-family: var(--font-display); font-size: 13px; letter-spacing: 2px; padding: 5px 12px; border-radius: 3px; text-decoration: line-through 2px; opacity: .85; animation: tjsFlicker 4s ease-in-out infinite; }
  .sleeping { position: absolute; left: 8px; top: 24px; font-family: var(--font-hand); font-weight: 700; font-size: 26px; color: var(--color-accent); transform: rotate(-3deg); }
  h1 { font-family: var(--font-display); font-weight: 400; line-height: .9; letter-spacing: -1px; margin: 30px 0 0; font-size: clamp(46px, 11vw, 104px); text-transform: uppercase; color: var(--color-ink); text-shadow: 2px 2px 0 rgba(0,0,0,.08); }
  .intro { font-size: 16px; line-height: 1.55; max-width: 430px; margin: 26px 0 0; opacity: .85; }
  .intro em { font-style: normal; border-bottom: 2px solid var(--color-accent); }
  .gary-row { display: flex; gap: 30px; align-items: flex-end; flex-wrap: wrap; margin-top: 38px; }
  .gary { position: relative; width: 300px; max-width: 78vw; margin: 0; cursor: pointer; user-select: none; background: var(--color-card-inner); padding: 12px 12px 14px; box-shadow: 0 10px 26px -12px rgba(0,0,0,.5); transform: rotate(1.4deg); animation: tjsBreathe 5.5s ease-in-out infinite; }
  .gary:hover { animation: tjsWob .5s ease-in-out; }
  .frame img { width: 100%; height: auto; filter: grayscale(1) contrast(1.5) brightness(1.07); }
  figcaption { font-family: var(--font-hand); font-weight: 700; font-size: 23px; line-height: 1.05; margin-top: 8px; }
  figcaption span { font-size: 18px; font-weight: 500; opacity: .8; }
  .z { position: absolute; top: -8px; font-family: var(--font-display); color: var(--color-ink); opacity: 0; animation: tjsDrift 4.2s ease-in infinite; }
  .z1 { right: 18px; font-size: 20px; } .z2 { right: 6px; font-size: 26px; animation-delay: 1.4s; } .z3 { right: 30px; font-size: 16px; animation-delay: 2.8s; }
  .poke-col { flex: 1 1 220px; min-width: 200px; }
  .poke-arrow { font-family: var(--font-hand); font-weight: 700; font-size: 24px; color: var(--color-accent); transform: rotate(-1.5deg); }
  .poke-line { font-size: 14px; line-height: 1.5; margin-top: 10px; min-height: 48px; opacity: .85; }
  .poke-tally { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: .5; margin-top: 14px; }
</style>
```

- [ ] **Step 3: Render in `index.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import Hero from "../components/Hero.astro";
---
<Layout>
  <main class="u-container"><Hero /></main>
</Layout>
```

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm build`
Expected: `0 errors`; build emits optimized `gary` variants under `dist/_astro/`.
`pnpm dev` → `http://localhost:4321/`: hero card matches the design (rotated paper, DECEASED stamp, big headline, Gary breathing, drifting z's, hover wobble). Screenshot and compare.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: hero section

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 5: FAQ section

**Files:**
- Create: `src/components/Faq.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: tokens. Produces: `<Faq />` (no props).

- [ ] **Step 1: Write `src/components/Faq.astro`**

Port the "Frequently asked, rarely answered" panel: four Q/A pairs with the design's exact copy (`are they dead?` → `they're sleeping.`; `but it isn't moving—` → `deep sleeper. always has been.`; `should i be concerned?` → `no. concern wakes them. let them rest.`; `why make a zine about this?` → `someone has to keep watch while they nap.`). Paper card with `.u-grain`, centred tape strip, `Archivo Black` heading, `Q.` markers in accent red, dashed dividers, `Caveat` answers. Scoped `<style>`; iterate the four items from a local array.

```astro
---
const qa = [
  { q: "are they dead?", a: "they're sleeping." },
  { q: "but it isn't moving—", a: "deep sleeper. always has been." },
  { q: "should i be concerned?", a: "no. concern wakes them. let them rest." },
  { q: "why make a zine about this?", a: "someone has to keep watch while they nap." },
];
---
<section class="faq u-grain" aria-label="Frequently asked questions">
  <div class="tape"></div>
  <h2>Frequently asked,<br />rarely answered</h2>
  <dl>
    {qa.map(({ q, a }, i) => (
      <div class:list={["row", { last: i === qa.length - 1 }]}>
        <span class="marker">Q.</span>
        <div><dt>{q}</dt><dd>{a}</dd></div>
      </div>
    ))}
  </dl>
</section>

<style>
  .faq { position: relative; background: var(--color-card); padding: 3.1rem 3rem 3.5rem; margin-top: 4.25rem; box-shadow: 0 26px 60px -20px rgba(0,0,0,.6); transform: rotate(0.4deg); }
  .tape { position: absolute; top: -14px; left: 50%; width: 140px; height: 32px; margin-left: -70px; background: var(--tape); mix-blend-mode: multiply; box-shadow: 0 1px 6px rgba(0,0,0,.18); transform: rotate(-1.5deg); }
  h2 { font-family: var(--font-display); font-size: clamp(26px, 5vw, 40px); text-transform: uppercase; letter-spacing: -.5px; line-height: .95; margin: 0; }
  dl { margin: 30px 0 0; display: flex; flex-direction: column; gap: 22px; }
  .row { display: flex; gap: 16px; align-items: baseline; border-bottom: 1.5px dashed color-mix(in oklab, var(--color-ink) 25%, transparent); padding-bottom: 16px; }
  .row.last { border-bottom: 0; padding-bottom: 0; }
  .marker { font-family: var(--font-display); color: var(--color-accent); font-size: 15px; flex: 0 0 26px; }
  dt { font-size: 16px; }
  dd { font-family: var(--font-hand); font-weight: 700; font-size: 24px; margin: 4px 0 0; }
</style>
```

- [ ] **Step 2: Add `<Faq />` to `index.astro`** (after `<Hero />`).

- [ ] **Step 3: Verify**

Run: `pnpm check && pnpm build` → `0 errors`. `pnpm dev` → FAQ panel matches design. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: FAQ section

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 6: Featured specimens (data + card + grid)

**Files:**
- Create: `src/data/specimens.ts`, `src/components/SpecimenCard.astro`, `src/components/FeaturedGrid.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces:
  - `interface Specimen { slug: string; name: string; issue: string; sub: string; wake: string; rot: string; taperot: string; }` and `const specimens: Specimen[]` (exported from `src/data/specimens.ts`), seeded from the design's six.
  - `<SpecimenCard specimen={Specimen} photo={ImageMetadata} />` — renders one card; hover reveals the `wake` bubble via **pure CSS** (`tjsPop`); per-card rotation via `define:vars`.
  - `<FeaturedGrid />` — loads `src/photos/featured/*` via `import.meta.glob` and renders a `<SpecimenCard>` per specimen.

- [ ] **Step 1: Write `src/data/specimens.ts`**

```ts
export interface Specimen {
  slug: string;   // matches the featured photo filename stem
  name: string;
  issue: string;
  sub: string;
  wake: string;
  rot: string;
  taperot: string;
}

// Seeded from the design. `slug` must match a file in src/photos/featured/<slug>.jpg.
// Jason: swap slugs to the real keeper photos.
export const specimens: Specimen[] = [
  { slug: "kevin",   name: "Kevin",    issue: "No. 02", sub: "pigeon · bus shelter",  wake: "I WASN'T asleep. I was thinking.",        rot: "-1.6deg", taperot: "-3deg" },
  { slug: "toad",    name: "Mr. Toad", issue: "No. 03", sub: "toad · the allotment",  wake: "five more minutes.",                       rot: "1.4deg",  taperot: "2deg"  },
  { slug: "beverley",name: "Beverley", issue: "No. 04", sub: "moth · the windowsill", wake: "is it morning? it's always morning.",      rot: "-1deg",   taperot: "4deg"  },
  { slug: "twins",   name: "The Twins",issue: "No. 05", sub: "two snails · the patio", wake: "we nap at our own pace, thanks.",          rot: "1.8deg",  taperot: "-2deg" },
  { slug: "gerald",  name: "Gerald",   issue: "No. 06", sub: "fox · the lay-by",      wake: "I'm nocturnal. this is normal.",           rot: "-1.3deg", taperot: "3deg"  },
  { slug: "patch",   name: "Patch",    issue: "No. 07", sub: "hedgehog · the verge",  wake: "do NOT unroll me.",                        rot: "1.1deg",  taperot: "-3deg" },
];
```

- [ ] **Step 2: Seed placeholder featured photos**

For each specimen slug, copy any archive photo to `src/photos/featured/<slug>.jpg` so the build resolves (Jason swaps later). Run e.g.:
```bash
for s in kevin toad beverley twins gerald patch; do cp src/photos/archive/augustus1.jpg "src/photos/featured/$s.jpg"; done
```

- [ ] **Step 3: Write `src/components/SpecimenCard.astro`**

```astro
---
import { Picture } from "astro:assets";
import type { Specimen } from "../data/specimens";
import type { ImageMetadata } from "astro";
interface Props { specimen: Specimen; photo: ImageMetadata; }
const { specimen, photo } = Astro.props;
---
<article class="card" define:vars={{ rot: specimen.rot, taperot: specimen.taperot }}>
  <div class="tape"></div>
  <div class="bubble">{specimen.wake}<span class="tail"></span></div>
  <div class="frame">
    <Picture src={photo} formats={["avif", "webp"]} widths={[228, 456]} sizes="228px" alt={specimen.name} />
  </div>
  <div class="meta"><span class="name">{specimen.name}</span><span class="issue">{specimen.issue}</span></div>
  <p class="sub">{specimen.sub}</p>
</article>

<style>
  .card { position: relative; background: var(--color-card-inner); padding: 11px 11px 13px; box-shadow: 0 9px 22px -12px rgba(0,0,0,.5); transform: rotate(var(--rot)); animation: tjsBreathe 6s ease-in-out infinite; transition: transform .5s ease; }
  .card:hover { transform: rotate(0deg) scale(1.025); animation-play-state: paused; }
  .tape { position: absolute; top: -12px; left: 50%; width: 86px; height: 24px; margin-left: -43px; background: var(--tape); mix-blend-mode: multiply; box-shadow: 0 1px 5px rgba(0,0,0,.16); transform: rotate(var(--taperot)); }
  .bubble { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); z-index: 5; background: var(--color-ink); color: var(--color-card); font-family: var(--font-hand); font-weight: 700; font-size: 18px; line-height: 1.1; padding: 7px 12px; border-radius: 14px; white-space: nowrap; box-shadow: 0 6px 16px -6px rgba(0,0,0,.6); opacity: 0; visibility: hidden; }
  .card:hover .bubble { animation: tjsPop .32s cubic-bezier(.2,1.3,.4,1) both; visibility: visible; }
  .tail { position: absolute; bottom: -6px; left: 50%; margin-left: -6px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid var(--color-ink); }
  .frame { position: relative; aspect-ratio: 4/3; overflow: hidden; }
  .frame img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.4) brightness(1.05); }
  .meta { margin-top: 9px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .name { font-family: var(--font-hand); font-weight: 700; font-size: 23px; line-height: 1; }
  .issue { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; opacity: .5; white-space: nowrap; }
  .sub { font-size: 11px; opacity: .65; margin: 3px 0 0; }
</style>
```

- [ ] **Step 4: Write `src/components/FeaturedGrid.astro`**

```astro
---
import SpecimenCard from "./SpecimenCard.astro";
import { specimens } from "../data/specimens";
import type { ImageMetadata } from "astro";

const photos = import.meta.glob<{ default: ImageMetadata }>("../photos/featured/*.{jpg,jpeg}", { eager: true });
const bySlug = new Map(
  Object.entries(photos).map(([path, mod]) => [path.split("/").pop()!.replace(/\.jpe?g$/i, ""), mod.default]),
);
---
<section class="featured u-grain" aria-label="Featured specimens">
  <div class="head">
    <h2>The collection</h2>
    <span class="warn">⚠ do not wake</span>
  </div>
  <p class="hint">hover to check they're still breathing.</p>
  <div class="grid">
    {specimens.map((s) => {
      const photo = bySlug.get(s.slug);
      return photo ? <SpecimenCard specimen={s} photo={photo} /> : null;
    })}
  </div>
</section>

<style>
  .featured { position: relative; background: var(--color-card); padding: 3.1rem 2.75rem 3.6rem; margin-top: 4.25rem; box-shadow: 0 26px 60px -20px rgba(0,0,0,.6); transform: rotate(-0.3deg); }
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { font-family: var(--font-display); font-size: clamp(26px, 5vw, 40px); text-transform: uppercase; letter-spacing: -.5px; line-height: .95; margin: 0; }
  .warn { font-family: var(--font-hand); font-weight: 700; font-size: 24px; color: var(--color-accent); transform: rotate(-2deg); }
  .hint { font-size: 13px; opacity: .65; margin: 8px 0 0; }
  .grid { margin-top: 34px; display: grid; grid-template-columns: repeat(auto-fill, minmax(228px, 1fr)); gap: 30px 26px; }
</style>
```

- [ ] **Step 5: Add `<FeaturedGrid />` to `index.astro`** (after `<Faq />`).

- [ ] **Step 6: Verify**

Run: `pnpm check && pnpm build` → `0 errors`. `pnpm dev` → six specimen cards, each rotated; hovering a card pauses its breathing and pops the black wake-bubble (pure CSS, no JS). Screenshot, confirm hover on at least one card.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: featured specimens grid with hover-to-wake

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 7: Archive grid (all ~214)

**Files:**
- Create: `src/components/ArchiveGrid.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `src/photos/archive/*` (from Task 3), tokens. Produces: `<ArchiveGrid />` (no props) — dense lazy-loaded thumbnail grid with `Specimen No. NNN` captions.

- [ ] **Step 1: Write `src/components/ArchiveGrid.astro`**

```astro
---
import { Image } from "astro:assets";
import type { ImageMetadata } from "astro";

const modules = import.meta.glob<{ default: ImageMetadata }>("../photos/archive/*.{jpg,jpeg}", { eager: true });
const photos = Object.keys(modules).sort().map((path, i) => ({
  img: modules[path].default,
  no: String(i + 1).padStart(3, "0"),
}));
---
<section class="archive u-grain" aria-label="The full archive">
  <div class="head">
    <h2>The archive</h2>
    <span class="count">{photos.length} specimens, all accounted for</span>
  </div>
  <div class="grid">
    {photos.map(({ img, no }) => (
      <figure class="cell">
        <Image src={img} widths={[200, 400]} sizes="(max-width: 600px) 45vw, 200px" alt={`Specimen No. ${no}`} loading="lazy" />
        <figcaption>No. {no}</figcaption>
      </figure>
    ))}
  </div>
</section>

<style>
  .archive { position: relative; background: var(--color-card); padding: 3.1rem 2.5rem 3.6rem; margin-top: 4.25rem; box-shadow: 0 26px 60px -20px rgba(0,0,0,.6); transform: rotate(0.3deg); }
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { font-family: var(--font-display); font-size: clamp(26px, 5vw, 40px); text-transform: uppercase; letter-spacing: -.5px; line-height: .95; margin: 0; }
  .count { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: .55; }
  .grid { margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; }
  .cell { margin: 0; position: relative; background: var(--color-card-inner); padding: 6px 6px 8px; box-shadow: 0 6px 14px -10px rgba(0,0,0,.5); }
  .cell img { width: 100%; aspect-ratio: 1; object-fit: cover; filter: grayscale(1) contrast(1.35) brightness(1.04); }
  figcaption { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; opacity: .5; margin-top: 4px; }
</style>
```

- [ ] **Step 2: Add `<ArchiveGrid />` to `index.astro`** (after `<FeaturedGrid />`).

- [ ] **Step 3: Verify (note the build cost)**

Run: `pnpm dev` first — dev optimizes images on demand, so the grid renders quickly. Confirm the dense grid lazy-loads thumbnails on scroll.
Then `pnpm build` — **this is the slow one: 5–20 min** as Sharp encodes ~214 photos × 2 widths × AVIF+WebP. Expected: build `Complete!`; count outputs: `find dist/_astro -type f | wc -l` → on the order of ~900–1,900 files (well under Cloudflare's 20,000 cap). The second build is fast (cached in `node_modules/.astro`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: archive grid of all specimens

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 8: Interactivity — poke counter + night-mode (poke logic tested)

**Files:**
- Create: `src/components/NightToggle.astro`, `src/scripts/poke.ts`, `src/scripts/poke.test.ts`
- Modify: `src/components/Hero.astro` (add the poke `<script>`), `src/pages/index.astro` (add `<NightToggle />`)

**Interfaces:**
- Consumes: Hero's `#poke`, `#poke-line`, `#poke-count` (Task 4); tokens.
- Produces:
  - `pokeLineFor(n: number): string` (exported from `src/scripts/poke.ts`) — the design's exact escalating lines.
  - `<NightToggle />` — fixed bottom-right toggle; flips `document.documentElement.dataset.theme` between `day`/`night`, persists to `localStorage["tjs-theme"]`.

- [ ] **Step 1: Write the failing test**

`src/scripts/poke.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { pokeLineFor } from "./poke.ts";

test("pokeLineFor returns the design's escalating lines", () => {
  assert.equal(pokeLineFor(0), "psst — go on, poke him. he won't mind.");
  assert.equal(pokeLineFor(1), "…see? nothing. completely peaceful.");
  assert.equal(pokeLineFor(2), "still asleep. impressively committed to it.");
  assert.equal(pokeLineFor(3), "okay he's REALLY sleeping now. ease off.");
  assert.equal(pokeLineFor(5), "you've poked Gary 5 times. he's still not getting up.");
  assert.equal(pokeLineFor(7), "Gary has filed a complaint. (he's asleep, but still.)");
  assert.equal(pokeLineFor(99), "Gary has filed a complaint. (he's asleep, but still.)");
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `node --test src/scripts/poke.test.ts`
Expected: FAIL — `pokeLineFor` not found.

- [ ] **Step 3: Write `src/scripts/poke.ts`**

```ts
export function pokeLineFor(p: number): string {
  if (p === 0) return "psst — go on, poke him. he won't mind.";
  if (p === 1) return "…see? nothing. completely peaceful.";
  if (p === 2) return "still asleep. impressively committed to it.";
  if (p === 3) return "okay he's REALLY sleeping now. ease off.";
  if (p < 7) return `you've poked Gary ${p} times. he's still not getting up.`;
  return "Gary has filed a complaint. (he's asleep, but still.)";
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `node --test src/scripts/poke.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the poke script into `Hero.astro`**

Append (Astro bundles/types this `<script>`; it imports the tested function):
```astro
<script>
  import { pokeLineFor } from "../scripts/poke";
  const card = document.getElementById("poke");
  const line = document.getElementById("poke-line");
  const count = document.getElementById("poke-count");
  let pokes = Number(localStorage.getItem("tjs-pokes") ?? "0");
  if (count) count.textContent = String(pokes);
  if (line) line.textContent = pokeLineFor(pokes);
  card?.addEventListener("click", () => {
    pokes += 1;
    localStorage.setItem("tjs-pokes", String(pokes));
    if (count) count.textContent = String(pokes);
    if (line) line.textContent = pokeLineFor(pokes);
  });
</script>
```

- [ ] **Step 6: Write `src/components/NightToggle.astro`**

```astro
<button id="night-toggle" type="button" aria-pressed="false">
  <span class="moon"></span><span class="label">quiet hours?</span>
</button>

<div class="overlay" aria-hidden="true">
  <span class="moon-big"></span><span class="shh">shhh…</span>
</div>

<script>
  const html = document.documentElement;
  const btn = document.getElementById("night-toggle");
  const label = btn?.querySelector(".label");
  const sync = () => {
    const night = html.dataset.theme === "night";
    if (label) label.textContent = night ? "shhh — quiet hours" : "quiet hours?";
    btn?.setAttribute("aria-pressed", String(night));
    document.querySelector(".overlay")?.classList.toggle("on", night);
  };
  sync();
  btn?.addEventListener("click", () => {
    html.dataset.theme = html.dataset.theme === "night" ? "day" : "night";
    localStorage.setItem("tjs-theme", html.dataset.theme);
    sync();
  });
</script>

<style>
  #night-toggle { position: fixed; bottom: 22px; right: 22px; z-index: 10; user-select: none; background: var(--color-card); padding: 9px 14px; box-shadow: 0 8px 22px -8px rgba(0,0,0,.7); transform: rotate(-2deg); display: flex; align-items: center; gap: 9px; border: 1.5px solid color-mix(in oklab, var(--color-ink) 25%, transparent); color: var(--color-ink); }
  .moon { width: 18px; height: 18px; border-radius: 50%; background: var(--color-ink); box-shadow: inset -6px -2px 0 -1px var(--color-card); }
  .label { font-family: var(--font-body); font-size: 12px; letter-spacing: 1px; }
  .overlay { position: fixed; inset: 0; z-index: 5; pointer-events: none; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .5s ease; background: rgba(12,14,26,.6); }
  .overlay.on { opacity: 1; }
  .overlay .moon-big { position: fixed; top: 42px; right: 54px; width: 64px; height: 64px; border-radius: 50%; background: #f0ecd9; box-shadow: 0 0 50px 14px rgba(240,236,217,.35), inset -16px -8px 0 -4px rgba(0,0,0,.14); }
  .shh { font-family: var(--font-hand); font-weight: 700; font-size: clamp(70px, 20vw, 200px); color: rgba(240,236,217,.12); transform: rotate(-6deg); }
</style>
```

- [ ] **Step 7: Add `<NightToggle />` to `index.astro`** (outside `<main>`, before `</Layout>`'s slot end — i.e. last child).

- [ ] **Step 8: Verify**

Run: `pnpm check && pnpm build` → `0 errors`. `pnpm dev`:
- Click Gary → `pokes logged` increments, line escalates; reload → count persists.
- Click the night toggle → overlay + moon appear, palette shifts, label → `shhh — quiet hours`; reload → stays night (no flash, thanks to the inline head script).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: poke counter and night-mode toggle

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 9: Footer, static extras, and caching headers

**Files:**
- Create: `src/components/Footer.astro`, `public/_headers`, `public/robots.txt`, `public/favicon.svg`, `public/og.png`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: tokens. Produces: `<Footer />`; the `_headers` immutable-cache rule for `/_astro/*`.

- [ ] **Step 1: Write `src/components/Footer.astro`**

Port the footer copy verbatim: "there's nowhere to follow. no shop. no newsletter. / just come back sometimes and check they're still sleeping." → "they will be." → the `theyrejustsleeping.com` badge → "no animals were disturbed in the making of this zine. / several were gently photographed. all are fine."

```astro
---
---
<footer class="foot u-grain">
  <p class="lead">there's nowhere to follow. no shop. no newsletter.<br />just come back sometimes and check they're still sleeping.</p>
  <p class="will">they will be.</p>
  <div class="badge">theyrejustsleeping.com</div>
  <p class="fine">no animals were disturbed in the making of this zine.<br />several were gently photographed. all are fine.</p>
</footer>

<style>
  .foot { position: relative; background: var(--color-card); padding: 3.4rem 3rem 3.1rem; margin-top: 4.25rem; box-shadow: 0 26px 60px -20px rgba(0,0,0,.6); transform: rotate(0.5deg); text-align: center; }
  .lead { font-size: 15px; line-height: 1.7; max-width: 460px; margin: 0 auto; }
  .will { font-family: var(--font-hand); font-weight: 700; font-size: 34px; color: var(--color-accent); margin: 14px 0 0; }
  .badge { display: inline-block; margin-top: 30px; border: 2.5px solid var(--color-ink); border-radius: 3px; padding: 9px 18px; transform: rotate(-2deg); font-family: var(--font-display); font-size: clamp(15px, 3.4vw, 22px); letter-spacing: 1px; text-transform: lowercase; }
  .fine { font-size: 10px; letter-spacing: 1px; opacity: .5; margin: 26px 0 0; }
</style>
```

- [ ] **Step 2: Write `public/_headers`**

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 3: Write `public/robots.txt`**

```
User-agent: *
Allow: /
Sitemap:
```
(Remove the empty `Sitemap:` line — single page, no sitemap.)

```
User-agent: *
Allow: /
```

- [ ] **Step 4: Write `public/favicon.svg`** (a small `z` mark on paper)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ece7da"/>
  <text x="16" y="23" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" text-anchor="middle" fill="#1c1814">z</text>
</svg>
```

- [ ] **Step 5: Create `public/og.png`**

Placeholder for now (Jason supplies the final). Generate a 1200×630 dark card with the title, or copy a temporary image:
```bash
# temporary stand-in until Jason provides the real OG image
cp src/photos/featured/gary.jpg public/og.png  # or any 1200x630 export
```
Note in the commit body that `og.png` is a placeholder.

- [ ] **Step 6: Add `<Footer />` to `index.astro`** (after `<ArchiveGrid />`, inside `<main>`).

- [ ] **Step 7: Verify**

Run: `pnpm check && pnpm build` → `0 errors`. Confirm `dist/_headers`, `dist/robots.txt`, `dist/favicon.svg`, `dist/og.png` exist. `pnpm dev` → footer matches design; favicon shows in tab.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: footer, _headers cache rules, robots/favicon/og

Claude-Session: https://claude.ai/code/session_01Sbga8A8oupipWJ429okxRq"
```

---

### Task 10: Deploy to Cloudflare (outward-facing — confirm first)

**⚠ Confirm with Jason before running.** This publishes the site and attaches the apex domain.

**Files:** none (uses `wrangler.jsonc` from Task 1).

- [ ] **Step 1: Authenticate Wrangler**

Run: `pnpm exec wrangler whoami` — if not logged in, `pnpm exec wrangler login` (Jason completes the browser OAuth; suggest he run `! pnpm exec wrangler login` in-session).

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: `Complete!`, `dist/` populated (HTML, `_astro/`, `_headers`, static files).

- [ ] **Step 3: Deploy**

Run: `pnpm exec wrangler deploy`
Expected: uploads assets, prints the `*.workers.dev` URL and that `theyrejustsleeping.com` is configured as a custom domain. If the apex has a conflicting CNAME, Wrangler errors — delete the conflicting DNS record in the Cloudflare dashboard, then re-run.

- [ ] **Step 4: Verify live**

Load `https://theyrejustsleeping.com/` (allow a minute for cert issuance). Confirm: page renders, fonts load, images served as AVIF/WebP (devtools Network), `/_astro/*` responses carry `Cache-Control: ...immutable`. Check on mobile width.

- [ ] **Step 5: (Optional) Connect Workers Builds for git CI**

In the Cloudflare dashboard → Workers → the project → connect the GitHub repo; build command `pnpm build`, deploy command `pnpm exec wrangler deploy`. **Cache `node_modules/.astro`** in the build settings or builds will re-encode all 214 images every push (15+ min). Requires a GitHub remote (none yet — `git remote add origin …` first).

- [ ] **Step 6: Log the outcome**

Per repo convention, offer to append to today's vault daily note: `- HH:MM [just-sleeping] shipped theyrejustsleeping.com to Cloudflare`.

---

## Self-Review

**Spec coverage:** Hybrid content model → Tasks 6 (featured) + 7 (archive). Astro/TS/Biome scaffold → Task 1. CSS architecture (tokens, keyframe-globalization, `@layer`, `define:vars`) → Task 2 + used in 4–9. Image pipeline (pre-shrink, `astro:assets`, formats, build caveat) → Tasks 3, 6, 7. Interactivity (hover-CSS, night-mode, poke) → Tasks 4, 6, 8. Hosting (`wrangler.jsonc`, `_headers`, custom domain, local-then-CI) → Tasks 1, 9, 10. Extras (favicon/og/robots) → Task 9. Non-goals (no sitemap/adapter/CF Images) → respected. **No gaps.**

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Featured photos and `og.png` are flagged as *intentional content placeholders* (Jason-driven per spec §11), with concrete stand-in commands so every task still builds. Real test code is present for the two logic units.

**Type consistency:** `Specimen` fields (`slug/name/issue/sub/wake/rot/taperot`) consistent between `specimens.ts`, `SpecimenCard.astro`, `FeaturedGrid.astro`. `pokeLineFor(n)` signature consistent across `poke.ts`, `poke.test.ts`, Hero's `<script>`. `targetWidth`/`sanitizeName`/`main` consistent across `shrink.ts`/`shrink.test.ts`. Hero element IDs (`#poke`, `#poke-line`, `#poke-count`) defined in Task 4, consumed in Task 8. Theme values `day`/`night` consistent across Layout, NightToggle, tokens.

One fix applied inline: Step 3 of Task 9 initially left a dangling `Sitemap:` line — corrected to the clean two-line `robots.txt`.
