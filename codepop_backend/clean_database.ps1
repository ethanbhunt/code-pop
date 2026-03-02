# Windows script: reset database and repopulate with seed data.
# Run from codepop_backend directory (where manage.py lives).
# Requires PostgreSQL with database codepop_database and migrate already applied once.

Write-Host "Resetting and repopulating database..."
Set-Location $PSScriptRoot

python manage.py makemigrations --no-input 2>$null
python manage.py migrate --no-input
if ($LASTEXITCODE -ne 0) { Write-Error "Migration failed."; exit 1 }

Write-Host "Flushing existing data..."
python manage.py flush --no-input
if ($LASTEXITCODE -ne 0) { Write-Error "Flush failed."; exit 1 }

Write-Host "Populating with seed data..."
python manage.py populate_db
if ($LASTEXITCODE -ne 0) { Write-Error "populate_db failed."; exit 1 }

Write-Host "Done. Database is clean and populated."
