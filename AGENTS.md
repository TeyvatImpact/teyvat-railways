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
src/main.ts → src/style.css         (Tailwind CSS v4 via @tailwindcss/vite)
           → src/App.vue
              ├── src/components/TitleBar.vue     (top bar, "关于" button)
              ├── src/components/RailwayMap.vue   (SVG map: pan/zoom, segments, stations, labels)
              ├── src/components/RoutePanel.vue   (right sidebar: routing UI)
              └── src/components/InfoDialog.vue   (markdown intro modal)
```

| Layer | File | Role |
|---|---|---|
| App | `App.vue` | Root layout, first-visit dialog trigger; flex layout with TitleBar + (map \| RoutePanel) |
| App | `TitleBar.vue` | Top title bar + "关于" button |
| App | `InfoDialog.vue` | Modal showing intro.md via `markdown-exit` + `github-markdown-css` |
| Map | `RailwayMap.vue` | SVG viewport with pan/zoom, grid lines, segments, stations, labels, markers; emits `station-click` |
| Routing | `RoutePanel.vue` | Right sidebar: fuzzy-search dropdown, map pick mode, calculate button, JSON result display |
| Overlays | `ZoomControls.vue` | Fixed bottom-right zoom +/- buttons |
| Overlays | `LineLegend.vue` | Fixed bottom-left mouse coordinate readout (data-space x,y) |
| Data | `composables/useMapData.ts` | Imports region JSON + ferry.json + same.json, computes segments with line offsetting for parallel tracks |
| Interaction | `composables/useMapInteraction.ts` | Mouse drag/scroll, touch pan/pinch-zoom; persists viewport to localStorage |
| Labels | `composables/useLabelPlacement.ts` | Label box layout + leader lines via `@chenglou/pretext` |
| **Routing** | **`composables/useRouting.ts`** | **Graph builder (node = prefix-stationId-lineId), Dijkstra multi-source/multi-target, fuzzy station search** |
| Config | `config/render.config.ts` | All render constants (fonts, palette, spacing, zoom threshold, special line colors) |

### Component tree (current)

```
App.vue
├── TitleBar                (position: relative, in flow)
├── .app-body (flex row)
│   ├── .map-area (flex: 1)
│   │   └── RailwayMap      (emits station-click)
│   └── RoutePanel          (width: 320px; receives map clicks via expose)
└── InfoDialog               (modal overlay)
```

## Data

All data is JSON stored in `src/data/`. No CSV files.

**IMPORTANT**: When working with these files, do NOT always read them in full — they can be large (e.g. `teyvat.json` is ~1100 lines). Read only the first ~30-40 lines to understand structure, or use `grep` to find specific stations/lines by ID or name. The schemas below describe the structure precisely — rely on them instead of full file reads.

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

### Region file schema (`teyvat.json`, `inazuma.json`, `liyue.json`)

```jsonc
{
  "config": { "x": number, "y": number, "name": string, "fontFamily": string },
  "stations": [
    { "id": string, "nameCn": string, "nameEn": string, "x": number, "y": number, "labelDir"?: string }
    // labelDir: one of "L","R","T","B","LT","LB","RT","RB"
  ],
  "lines": [
    {
      "id": string,            // short id like "A","B","L1","S1","NK"...
      "name": string,
      "nameEn": string,
      "lineLabels"?: [ [stationId, position], ... ],  // position = label placement dir
      "stations": [ [stationId, diagonalFirst], ... ]  // diagonalFirst = boolean
    }
  ]
}
```

### Special line files

**`ferry.json`** — `{ lines: [{ id, name, nameEn, "lineType": "ferry", stations: [[prefixedId, false], ...] }] }`  
**`same.json`** — `{ lines: [{ id, name, nameEn, "lineType": "same-station", stations: [[prefixedId, false], ...] }] }`

Ferry and same-station lines use **already-prefixed** station IDs (e.g. `"Teyvat-LYS"`) to reference stations across region files. They are not re-prefixed at runtime.

### Annotation file (`mark.json`)

```jsonc
{
  "paths": [
    { "d": string, "stroke"?: string }   // SVG path data (data-space coords)
  ],
  "texts": [
    { "content": string, "x": number, "y": number, "fontSize"?: number, "fontFamily"?: string }
  ]
}
```

### Station/line field details

- **`id`** (station): Short uppercase code, e.g. `"LYH"`, `"RTP"`. Gets runtime prefix → `"Teyvat-LYH"`.
- **`labelDir`**: Optional, one of `L`/`R`/`T`/`B`/`LT`/`LB`/`RT`/`RB`. Controls label offset direction from station point.
- **`diagonalFirst`**: Controls path routing for non-axis-aligned segments (`true` = diagonal→orthogonal, `false` = orthogonal→diagonal).
- **`lineLabels`**: Optional array of `[stationId, position]` — instructs renderer where to place the line's name label relative to that station.
- **`config.x`/`config.y`**: Origin offset applied to all station coordinates in that region at runtime.

## Routing (`useRouting.ts`)

**Graph construction** (built once at module load):

| Edge type | Weight | Description |
|---|---|---|
| Line adjacency | 1 | Consecutive stations on the same regular line |
| Ferry adjacency | 5 | Consecutive stations on a `lineType: "ferry"` line |
| Same-network same-station transfer | 0.1 | Two lines sharing the same physical station (same prefix) |
| Cross-network transfer (same.json) | 0.5 | Connections defined in `same.json` (different prefix) |

**Node format**: `` `${stationFullId}-${lineId}` ``, e.g. `Teyvat-LYH-A`, `Liyue-KYB-ferry-kyb-rtp`.

**`findRoute(startStationId, endStationId)`**: gathers ALL line-nodes for each physical station, runs Dijkstra with virtual multi-source / multi-target (all start-nodes at dist 0, stop when any end-node is reached).

**`searchStations(query)`**: fuzzy match against `nameCn`, `nameEn`, `id`, short ID; returns up to 20 `StationSuggestion` entries with line info.

**Result**: JSON blob with `{ segments, pathNodeIds, totalWeight }`.

## Conventions

- **Coordinates**: data units × `BLOCK_SIZE` (50px). SVG viewport sized to data bounds with configurable `margin`.
- **Label fonts**: Inazuma stations use `"Noto Serif JP", serif` from Google Fonts; others use `"Noto Sans SC"`.
- **Label sizes**: Large (`fsCN: 24`, `fsEN: 16`) and small (`12`, `8`). Small shown for all stations when zoom ≥ 0.5; below threshold only transfer stations get large labels.
- **Line palette**: Cycles through 20 colors in `render.config.ts`.
- **Parallel tracks**: Shared segments are offset by `LINE_WIDTH` per line, centered.
- **Viewport persistence**: Pan/zoom saved to localStorage key `teyvat-railways-map-state`.
- **All imports**: Use `@/*` path alias → `./src/*`.
- **SVG isolation**: RailwayMap.vue uses ONLY inline styles (`fill`, `stroke`, SVG attributes) — no Tailwind CSS classes. This allows the SVG to be copy-pasted as a standalone SVG file.
- **UI styling**: All other Vue components CAN use Tailwind utility classes (`flex`, `p-4`, `text-sm`, etc.).

## CSS / Tailwind

- **Tailwind CSS v4** with `@tailwindcss/vite` plugin (configured in `vite.config.ts`).
- No `tailwind.config.js` / `postcss.config.js` needed (v4 zero-config).
- Entry: `src/style.css` → `@import "tailwindcss"` — imported first in `src/main.ts`.
- **Do NOT use Tailwind classes inside RailwayMap.vue's template** — the SVG must remain self-contained for export.

## Gotchas

- `dist/` is committed to git — rebuilding overwrites it on build.
- Data imports in `useMapData.ts` use short names (`teyvat.json`, `inazuma.json`, etc.). If you add a new region, mirror this pattern.
- `vue-tsc` is in devDeps but has no npm script — run via `npx vue-tsc --noEmit`.
- Manual verification only: run `pnpm dev` and check the browser.
- Ferry/same-station JSON files don't have their own stations — lines reference prefixed station IDs (e.g. `Teyvat-LYS`) directly. These lines are not run through the standard prefix step.
- `intro.md` is imported via `?raw` in `InfoDialog.vue` and rendered with `markdown-exit`. The modal has `github-markdown-css` with transparent background override.
- First visit detection uses localStorage key `teyvat-railways-visited`.
- RoutePanel exposes `onStationClick(stationId)` via `defineExpose` — App.vue calls it when RailwayMap emits `station-click`.
- `useRouting.ts` builds the graph eagerly at module import time (synchronous, runs once).
