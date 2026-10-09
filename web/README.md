# Web — Vue 3 + Pinia + Tailwind

The front end: a full-screen dashboard with the RJHI layout — a collapsible blue sidebar for filters, a pill
navbar with the sections from `src/sections.ts`, the spotlight dot-grid background, value boxes, charts and
tables. It reads from the API in [`api/`](../api/README.md).

## Run

From the repo root, `npm run dev` starts the API and the web app together (open http://localhost:5173).
To run the web app on its own (the API must be running on port 3000):

```powershell
cd web
npm install          # once
npm run dev          # http://localhost:5173
```

In development, Vite forwards `/api/*` requests to port 3000 (see `vite.config.ts`), so the browser sees
one address, the same as on Azure Static Web Apps with a linked API.

Other commands: `npm run test:unit` (tests), `npm run lint`, `npm run build` (type-checks, then builds `dist/`).

## Where things are

| Folder | What's there |
|---|---|
| `src/pages/` | One file per page; the file name is the route (`overview.detail.vue` → `/overview/detail`) |
| `src/sections.ts` | The navbar sections and sub-pages; `ready: false` shows a "soon" badge |
| `src/components/` | The shell (layout, navbar, brand, background) and building blocks (value box, charts, table) |
| `src/stores/filters.ts` | The current filter choices, shared across the page (like Shiny's `input$…`) |
| `src/composables/` | URL-synced filters, debounced fetching, the chart theme |
| `src/assets/main.css` | Colour and font tokens, light and dark |
