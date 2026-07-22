# MEMO

## Quick start

From the repo root, run:

```powershell
.\dev.ps1
```

You'll be asked to choose an environment:

- **[L]ocal** — opens the backend (`venv` activate + `pip install -r requirements.txt` + `uvicorn main:app --reload`) and the frontend (`npm install` + `npm run dev`), each in their own PowerShell window.
- **[D]ocker** — stops any existing containers (`docker compose down`), then rebuilds and starts them (`docker compose up --build`). Requires Docker to be installed and running.
