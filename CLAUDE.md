# RJHI dashboard template — project context

## What this is
The template for RJ Health Informatics Ltd (Ross Johnson) dashboards: a Vue 3 + Tailwind front end and a Node +
Express + Knex API, with the RJHI layout and look built in, running on made-up example data. New apps start from
it with GitHub's "Use this template". When this file is in a new app made from the template, update this section
to describe that app.

- **Owner:** RJ Health Informatics Ltd; all rights reserved (see `COPYRIGHT`). Apps may be shared with clients
  such as MBI Health for discussion, which doesn't transfer any rights.
- **Data:** public or made-up data only in this repo. Never put patient-level or other sensitive data in it, and
  never in anything shared with `npm run share`.

## Working with Ross
- Ross is an NHS analyst and consultant, not a professional developer. Explain new ideas in plain terms, compared
  with R/Shiny where there's an equivalent.
- Headline first, then detail on request.
- Small, reviewable steps. Agree a plan before building.
- Check changes in the browser (screenshots, measurements) before calling them done.

## Design
Ross's full design preferences are in `~/.claude/design-preferences.md`, if that file exists on this machine.
Follow them, except where this section says otherwise. The essentials, which this template already implements:

- **Compact:** `html { font-size: 90% }`; chart text scales with `fontScale` from `useChartTheme`.
- **One screen on desktop:** no page scroll. Charts stretch to fit, and tables scroll inside their own area.
  Phones scroll normally.
- **Transparent, borderless cards.** Table rows and sticky headers are solid white.
- **Spotlight dot-grid background:** `SpotlightBackground.vue`.
- **Sidebar:** full height, collapsed by default (remembered per browser). When collapsed, a strip of icon
  buttons opens each filter (`RailPopover.vue`). The key input sits mid-page until something is chosen.
- **Navbar:** a centred pill (`AppNavbar.vue`) with sections from `sections.ts`. Unbuilt sections show "soon".
  The brand sits on the right.
- **Value boxes:** `StatTile.vue`. A label (with any note inline), a big number, the change vs the previous
  period (▲/▼ plus words, good or bad colour), and a sparkline.
- **Card titles on one line:** **Title** | lighter detail (`CardTitle.vue`).
- **Layout:** charts (~40%, stacked) beside the table (~60%).
- **Charts (ECharts):**
  - 2px lines, with markers only on the latest and selected points
  - targets as a thin labelled line
  - faint gridlines and tooltips everywhere
  - stacked ordered bands with a legend that can't be clicked
  - stacked charts share margins, so months line up
  - clicking a month selects it everywhere
- **Tables (TanStack, `table/DataTable.vue`):**
  - sortable, with Shift-click for a second sort
  - click or Enter selects a row
  - change arrows, data bars with a target tick, and expandable detail rows
  - numbers right-aligned in tabular figures
- **UK formats:** "Jul 2026" (and "Sep", not "Sept"), 88,602, 67.8%, "−0.6 pts". Dates are UTC.
- **Accessibility (non-negotiable):**
  - never colour alone, and screen-reader text for changes
  - everything works from the keyboard
  - "reduce motion" is respected
  - contrast is checked with a script, not by eye
  - the data behind each chart is available as a table

### Palette (differs from the design preferences)
- **Default:** darkened from MBI's palette (#C0A0CE #C59FB8 #CEA4A5 #D5ACA0 #DABDAE #E0CFC5). The hues are kept,
  with lightness changed until everything passes contrast checks:
  - mauve series `#9c638a`
  - plum sidebar `#7f496f`
  - bands `#dba797` / `#9c638a` / `#5e356e`
- **RJHI blue:** kept switched off in `main.css`. `data-palette="rjhi-blue"` on `<html>` brings it back.
- **Brand mark:** always RJHI blue (`--color-brand`).
- **Rules for colours:**
  - Use the tokens (`bg-sidebar`, `text-ink-secondary`, `--color-band-*`), never raw hex in components.
  - Check any new colour with a script: 4.5:1 for text, 3:1 for lines and marks, and colour-blind separation for
    anything that must be told apart.

## How the code fits together
- **Pattern:** a Pinia filter store (`stores/filters.ts`, like Shiny's `input$…`) feeds `useDebouncedFetch`
  (waits 300ms, cancels stale requests), which calls the API.
- **API:** validates every query parameter against an allow-list (`api/src/filters.js`). Knex builds the query,
  and the result comes back as paginated JSON. Unknown parameters get a 400.
- **Filters in the URL:** `useFiltersInUrl` keeps them in step both ways (shareable links, Back/Forward). Filters
  at their default are left out of the URL.
- **Routes come from files:** `web/src/pages/overview.detail.vue` → `/overview/detail`. Sections and sub-pages
  are listed in `web/src/sections.ts`.
- **Example page:** `web/src/pages/overview.vue` uses every building block. Copy it for new pages.
- **Generic components:** `OrganisationPicker`, `CategorySelect`, `TrendChart` (points + target), `BandChart`
  (stacked ordered bands), `DataTable` + `DeltaCell` / `PctBarCell`, `DownloadButton` (Excel via
  `utils/xlsx.ts`).

## Commands
- `npm run setup` once, then `npm run dev`: the API on :3000 and the web app on :5173.
- `npm test`: API (node:test) and web (Vitest) tests.
- In `web/`:
  - `npx oxlint . && npx eslint .`: lint, as CI runs it
  - `npm run build`: type-check, then build
- CI (`.github/workflows/ci.yml`) runs the tests, lint and build, and builds both Docker images, on every push.

## Conventions
- Match the surrounding code: comment density, plain-English comments that say why, and Shiny analogies where
  helpful.
- **Line endings are LF** (`web/.gitattributes`). On Windows, write files without converting to CRLF.
- **Tests:** the API routes, pickers, layout, navbar, table, composables, utilities and the example page have
  tests. Add or update them with each change, and run them before committing.
- **New analysis goes on a new page** (a sub-page in `sections.ts`), rather than reshaping a finished page.
