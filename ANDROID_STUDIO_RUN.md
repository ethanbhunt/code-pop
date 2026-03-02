# How to Run CodePop for Show-and-Tell (Android Studio)

Follow these steps to run the CodePop app in the Android emulator for your presentation.

---

## Prerequisites

- **PostgreSQL** installed and running (default: user `postgres`, password `password`, port 5432).
- **Node.js** installed.
- **Android Studio** installed with an Android Virtual Device (AVD) created.
- **Python 3** with the backend virtual environment set up (see README).

---

## 1. Create the database (first time only)

If you haven’t already, create the PostgreSQL database:

```sql
-- In psql or pgAdmin, run:
CREATE DATABASE codepop_database;
```

---

## 2. Start the backend

1. Open a terminal and activate the backend virtual environment:
   - **Windows (Git Bash):** `source codepop_virtual_enviroment/Scripts/activate`
   - **Windows (PowerShell):** `.\codepop_virtual_enviroment\Scripts\Activate.ps1`
   - **Mac/Linux:** `source codepop_virtual_enviroment/bin/activate`

2. Go to the backend folder:
   ```bash
   cd codepop_backend
   ```

3. Apply migrations and load seed data:
   - **Windows (PowerShell):**
     ```powershell
     .\clean_database.ps1
     ```
   - **Mac/Linux/Git Bash:**
     ```bash
     ./clean_database.sh
     ```
   If you prefer to do it manually:
   ```bash
   python manage.py migrate
   python manage.py flush --no-input
   python manage.py populate_db
   ```

4. Start the Django server (must be reachable from the emulator):
   - **Android emulator on this machine:** use `0.0.0.0:8000` so the emulator can use `10.0.2.2:8000`:
     ```bash
     python manage.py runserver 0.0.0.0:8000
     ```
   - **Physical Android device:** use your PC’s IP and port 8000 (e.g. `192.168.1.100:8000`). Update `codepop/ip_address.js` to use that IP instead of `10.0.2.2`.

Leave this terminal running.

---

## 3. Set the app’s backend URL (if needed)

- **Android emulator:** `codepop/ip_address.js` is set to `http://10.0.2.2:8000` (host machine from emulator). No change needed if the backend runs on the same PC.
- **Physical device:** In `codepop/ip_address.js`, set `BASE_URL` to your PC’s IP and port, e.g. `http://192.168.1.100:8000`. Get your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

---

## 4. Start the Android emulator

1. Open **Android Studio**.
2. Go to **Tools → Device Manager** (or **AVD Manager**).
3. Start an existing virtual device (e.g. Pixel) by clicking the play button, or create one if needed.

Wait until the emulator is fully booted.

---

## 5. Start the React Native (Expo) app

1. Open a **new** terminal.
2. Go to the frontend folder:
   ```bash
   cd codepop
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start the app and run it on Android:
   ```bash
   npm run android
   ```

Expo will build and install the app on the emulator. The CodePop app should open automatically.

---

## 6. Test accounts (after `populate_db`)

| Username     | Password | Role            |
|--------------|----------|-----------------|
| super        | password | Admin (super)   |
| staff        | password | Manager         |
| test / test2 | password | User            |
| logistics_a … logistics_g | password | Logistics (one per hub) |
| repair_c     | password | Repair staff (Region C) |

---

## Troubleshooting

- **“Connection refused” or app can’t reach backend**
  - Backend must be running: `python manage.py runserver 0.0.0.0:8000`.
  - Emulator: keep `BASE_URL` as `http://10.0.2.2:8000`.
  - Physical device: use your PC’s IP in `BASE_URL` and ensure phone and PC are on the same Wi‑Fi.

- **PostgreSQL connection refused**
  - Start PostgreSQL (e.g. start the Windows service or run `pg_ctl start`).

- **Stripe / payment errors**
  - Payment flow needs real Stripe keys in `codepop_backend/codepop_backend/settings.py`. For a demo you can skip checkout or use test keys.

- **“expo-font” or other module not found**
  - In `codepop`: run `npm install` again.

---

## Quick recap

1. Start PostgreSQL and create `codepop_database` if needed.
2. In `codepop_backend`: run `clean_database.ps1` (or the manual migrate/flush/populate_db), then `python manage.py runserver 0.0.0.0:8000`.
3. In Android Studio: start an Android emulator.
4. In `codepop`: `npm install` (first time), then `npm run android`.

You should then have the app running in the emulator for your show-and-tell.
