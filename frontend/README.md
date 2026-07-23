# λLens — Frontend

Vue 3 + TypeScript client for λLens, the wavelength-domain FOM (Figure of
Merit) data tool: upload a gold-standard Excel/CSV file and explore it as an
interactive scatter plot (`/`), or batch-extract FOM records from scientific
PDFs via Gemini (`/extraction`, dev-only in production builds).

See the [repository root README](../README.md) for how to run the whole
stack (backend + frontend) with `dev.ps1` or Docker.

## Stack

- [Vue 3](https://vuejs.org/) (`<script setup>`) + [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) with [shadcn-vue](https://www.shadcn-vue.com/) components (`src/components/ui/`)
- [ECharts](https://echarts.apache.org/) (via `vue-echarts`) for the FOM scatter plot
- [vue-i18n](https://vue-i18n.intlify.org/) — English, French, Korean, Chinese (`src/locales/`)

## Development

```bash
npm install
npm run dev
```

The dev server expects the backend at the URL in `VITE_API_URL`
(`.env.local`, defaults to `http://localhost:8000/`).

Other scripts:

```bash
npm run type-check   # vue-tsc, no emit
npm run build         # type-check + production build to dist/
npm run preview       # serve the production build locally
```

## Structure

```
src/
  components/
    ui/            # shadcn-vue primitives (Button, Card, Select, Tabs...)
    extraction/    # PDF-extraction view components
    visualization/ # FOM chart + controls
    layout/        # navbar, tool actions bar, language selector
    shared/        # dropzone, status toast
  composables/     # reusable reactive logic (useTransientStatus)
  lib/utils.ts     # shadcn's `cn()` class-merging helper
  locales/         # i18n message files
  router/          # route definitions
  services/        # backend API client (api.ts), i18n setup
  utils/           # column type detection, CSV export
  views/           # top-level routed pages
```

## Adding a shadcn-vue component

This project uses shadcn-vue in its normal "import the source" mode, not a
package dependency — components live under `src/components/ui/` and are
meant to be read and modified like any other project code. Use the CLI to
scaffold a new one:

```bash
npx shadcn-vue@latest add <component>
```
