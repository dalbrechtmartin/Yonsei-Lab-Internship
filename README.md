# λLens

λLens is a tool for wavelength-domain FOM (Figure of Merit) data. It has two
parts:

- A **visualization** view: upload a gold-standard Excel/CSV file and explore
  it as an interactive scatter plot with filters, group comparisons, and
  pinned annotations.
- An **extraction** view (dev-only in production builds): batch-extract FOM
  records from scientific PDFs via Gemini.

## Stack

**Runtime**

- Backend: [FastAPI](https://fastapi.tiangolo.com/) + [polars](https://pola.rs/) (with [fastexcel](https://pypi.org/project/fastexcel/) for `.xlsx` reads) for data handling, [PyMuPDF](https://pymupdf.readthedocs.io/) for PDF parsing, [google-genai](https://ai.google.dev/) (Gemini) for extraction. No database: job state is persisted as JSON files (see `backend/state.py`).
- Frontend: [Vue 3](https://vuejs.org/) (`<script setup>`, TypeScript) + [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/) with [shadcn-vue](https://www.shadcn-vue.com/) components, [vue-i18n](https://vue-i18n.intlify.org/) for English, French, Korean, Chinese.
- Visualization & export: [ECharts](https://echarts.apache.org/) (via `vue-echarts`) for the FOM scatter plot, [Konva](https://konvajs.org/) (via `vue-konva`) for the comparison-view annotation canvas, [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas-pro](https://github.com/niklasvh/html2canvas) for the PDF guide/exports, [SheetJS](https://sheetjs.com/) (`xlsx`) for client-side spreadsheet parsing, [@lucide/vue](https://lucide.dev/) for icons, [flag-icons](https://github.com/lipis/flag-icons) for the language selector, [@vueuse/core](https://vueuse.org/) for composition utilities.

**Tooling & CI**

- Linting/formatting: [Ruff](https://docs.astral.sh/ruff/) (backend), [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) (frontend), TypeScript in `strict` mode (`vue-tsc`).
- Tests: [pytest](https://docs.pytest.org/) covers `backend/reconcile.py` (see `backend/tests/`). There is currently no automated frontend test suite (no Vitest/component tests, no e2e) — frontend changes are verified manually.
- CI/CD: [GitHub Actions](.github/workflows/) run lint + tests on every push/PR, [Dependabot](.github/dependabot.yml) keeps dependencies current, [release-please](.github/workflows/release-please.yml) automates versioning and `CHANGELOG.md`.
- Deployment: multi-stage [Docker](#docker) images (non-root user, healthcheck), frontend served by `nginx-unprivileged`.

## Quick start

From the repo root, run:

```powershell
.\dev.ps1
```

or:

```powershell
powershell.exe -File dev.ps1
```

You'll be asked to choose an environment:

- **[L]ocal**: opens the backend (`venv` activate + `pip install -r requirements.txt` + `uvicorn main:app --reload`) and the frontend (`npm install` + `npm run dev`), each in their own PowerShell window.
- **[D]ocker**: stops any existing containers (`docker compose down`), then rebuilds and starts them (`docker compose up --build`). Requires Docker to be installed and running.

## Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` before
using the extraction view.

Run tests with:

```bash
pytest
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server expects the backend at the URL in `VITE_API_URL`
(`frontend/.env.local`, defaults to `http://localhost:8000/`).

Other scripts:

```bash
npm run type-check   # vue-tsc, no emit
npm run build         # type-check + production build to dist/
npm run preview       # serve the production build locally
```

### Structure

```
frontend/src/
  components/
    ui/            # shadcn-vue primitives (Button, Card, Select, Input, Textarea, Tabs...)
    extraction/    # PDF-extraction view components
    visualization/ # FOM chart, axis/filter controls, group comparison, annotations
    layout/        # navbar, footer, tool actions bar, language selector
    shared/        # dropzone, status toast, filter chips, collapsible sections
  composables/     # reusable reactive logic (useToastQueue)
  lib/utils.ts     # shadcn's `cn()` class-merging helper
  locales/         # i18n message files (en, fr, ko, zh)
  router/          # route definitions
  services/        # backend API client (api.ts), i18n setup
  utils/           # column type detection, stats, CSV/Excel export
  views/           # top-level routed pages (Home, Visualization, Extraction)
```

### Adding a shadcn-vue component

This project uses shadcn-vue in its normal "import the source" mode, not a
package dependency: components live under `src/components/ui/` and are
meant to be read and modified like any other project code. Use the CLI to
scaffold a new one:

```bash
npx shadcn-vue@latest add <component>
```

## Docker

```bash
docker compose up --build
```

The backend needs `GEMINI_API_KEY` set in the environment (see
`backend/.env.example`). Ports can be overridden with `BACKEND_HOST_PORT`
and `FRONTEND_HOST_PORT`.

## License

[BSD-3-Clause](LICENSE)
