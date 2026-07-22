# Script to launch the development environment for the project.
# You can choose to run it in a local environment or using Docker containers.
# For docker, ensure that Docker is installed and running on your machine.
# Usage: .\dev.ps1

$root = $PSScriptRoot

$choice = Read-Host "Choose anenvironment : [L]ocal | [D]ocker"

if ($choice -match '^[Dd]') {
    docker compose -f "$root\docker-compose.yml" down
    docker compose -f "$root\docker-compose.yml" up --build
}
elseif ($choice -match '^[Ll]') {
    Start-Process powershell -ArgumentList @(
        '-NoExit', '-Command',
        "cd '$root\backend'; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn main:app --reload"
    )

    Start-Process powershell -ArgumentList @(
        '-NoExit', '-Command',
        "cd '$root\frontend'; npm install; npm run dev"
    )
}
else {
    Write-Host "Please choose a valid option: [L]ocal or [D]ocker"
}
