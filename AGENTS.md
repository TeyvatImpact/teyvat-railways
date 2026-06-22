# Teyvat Railways — AGENTS.md

## Quick start

```
pnpm install
pnpm dev        # vite dev server at localhost:5173
pnpm build      # vite build (base: `/tr`)
pnpm preview    # vite preview of built dist/
```

Typecheck: `npx vue-tsc --noEmit` (no npm script exists for it).

No lint, no test, no formatter scripts configured. `oxfmt` is configured in `.oxfmtrc.json` but not in dependencies — install globally to use.

## Architecture

```
src/main.ts → src/App.vue
              ├── src/components/TitleBar.vue     (fixed top bar)
              ├── src/components/InfoDialog.vue   (markdown intro modal)
              └── src/components/RailwayMap.vue
```

| Layer | File | Role |
|---|---|---|
| App | `App.vue` | Root layout, first-visit dialog trigger |
| App | `TitleBar.vue` | Fixed top title bar + "关于" button |
| App | `InfoDialog.vue` | Modal showing intro.md via `markdown-exit` + `github-markdown-css` |
| Map | `RailwayMap.vue` | SVG viewport with pan/zoom, grid lines, segments, stations, labels, markers |
| Overlays | `ZoomControls.vue` | Fixed bottom-right zoom +/- buttons |
| Overlays | `LineLegend.vue` | Fixed bottom-left mouse coordinate readout (data-space x,y) |
| Data | `composables/useMapData.ts` | Imports region JSON + ferry.json + same.json, computes segments with line offsetting for parallel tracks |
| Interaction | `composables/useMapInteraction.ts` | Mouse drag/scroll, touch pan/pinch-zoom; persists viewport to localStorage |
| Labels | `composables/useLabelPlacement.ts` | Label box layout + leader lines via `@chenglou/pretext` |
| Config | `config/render.config.ts` | All render constants (fonts, palette, spacing, zoom threshold, special line colors) |

## Data

All data is JSON stored in `src/data/`. No CSV files.

Three region files, each with structure `{ config, stations, lines }`:

| File | Config prefix | Config font |
|---|---|---|
| `teyvat.json` | `"Teyvat"` | `"Noto Sans SC"` |
| `inazuma.json` | `"Inazuma"` | `"Noto Serif JP"` (loaded via Google Fonts in `index.html`) |
| `liyue.json` | `"Liyue"` | `"Noto Sans SC"` |

`mark.json` contains `{ paths, texts }` for annotation overlays.

Two special line files:

| File | `lineType` | Visual style |
|---|---|---|
| `ferry.json` | `"ferry"` | Thin dark blue dashed line |
| `same.json` | `"same-station"` | Thin semi-transparent black solid line |

Station format: `{ id, nameCn, nameEn, x, y, labelDir? }`.  
Line format: `{ id, name, nameEn, stations: [[stationId, diagonalFirst], ...] }`.

`diagonalFirst` controls path routing for non-axis-aligned segments (orthogonal→diagonal or diagonal→orthogonal). IDs get prefixed with `<Config name>-` at runtime.  
Ferry and same-station lines use **already-prefixed** station IDs (e.g. `"Teyvat-LYS"`) so they can reference stations across different region files. They are not re-prefixed at runtime.

## Conventions

- **Coordinates**: data units × `BLOCK_SIZE` (50px). SVG viewport sized to data bounds with configurable `margin`.
- **Label fonts**: Inazuma stations use `"Noto Serif JP", serif` from Google Fonts; others use `"Noto Sans SC"`.
- **Label sizes**: Large (`fsCN: 24`, `fsEN: 16`) and small (`12`, `8`). Small shown for all stations when zoom ≥ 0.5; below threshold only transfer stations get large labels.
- **Line palette**: Cycles through 20 colors in `render.config.ts`.
- **Parallel tracks**: Shared segments are offset by `LINE_WIDTH` per line, centered.
- **Viewport persistence**: Pan/zoom saved to localStorage key `teyvat-railways-map-state`.
- **All imports**: Use `@/*` path alias → `./src/*`.

## Gotchas

- `dist/` is committed to git — rebuilding overwrites it on build.
- Data imports in `useMapData.ts` use short names (`teyvat.json`, `inazuma.json`, etc.). If you add a new region, mirror this pattern.
- `vue-tsc` is in devDeps but has no npm script — run via `npx vue-tsc --noEmit`.
- Manual verification only: run `pnpm dev` and check the browser.
- Ferry/same-station JSON files don't have their own stations — lines reference prefixed station IDs (e.g. `Teyvat-LYS`) directly. These lines are not run through the standard prefix step.
- `intro.md` is imported via `?raw` in `InfoDialog.vue` and rendered with `markdown-exit`. The modal has `github-markdown-css` with transparent background override.
- First visit detection uses localStorage key `teyvat-railways-visited`.
