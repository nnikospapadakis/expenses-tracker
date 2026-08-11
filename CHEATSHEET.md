# Expenses Tracker — Operations Cheatsheet

Everything you need to run, change, back up, and redeploy the app.
**If starting a fresh Claude session:** point it at this file and at
`.claude/projects/.../memory/deployment-cpanel-subpath.md`.

---

## The two-minute summary

- **Live app:** https://nikos-papadakis.com/tracker  ·  **sign in with Google**
- **Hosting:** cPanel shared host (user `nipapada`), run via **Setup Node.js App**.
  App folder on server: `/home/nipapada/expenses-tracker/`, startup file `app.cjs`.
- **Local project (your workshop):** `D:\ExpensesTracker`
  - `client/` = React + Vite front end
  - `server/` = Node + Express back end (data in a JSON file, no database engine)
- **Your data = one file:** `data/data.json` (see Backups below).

### Non-obvious things that WILL bite you if forgotten
1. **The server has no npm internet** — never rely on "Run NPM Install". We ship
   `node_modules` *inside* the upload zip.
2. **Never overwrite the server's `data/data.json`** on redeploy — it holds all
   your real data. The build script below excludes it.
3. The app runs under the **`/tracker` subpath**, not a subdomain (avoids DNS).
4. **Restart the app** in Setup Node.js App after any file change, or nothing
   updates.
5. **Login is Google-only.** The server needs `GOOGLE_CLIENT_ID` in its `.env`
   (see the reference table below). Only Google accounts added as **test users**
   in Google Cloud Console can sign in until the app is "Published" there.

---

## Run it locally (to develop / test changes)

Two terminals:
```
cd D:\ExpensesTracker\server
npm install        # first time only
npm run dev        # API on http://localhost:4000
```
```
cd D:\ExpensesTracker\client
npm install        # first time only
npm run dev        # UI on http://localhost:5173
```
Open http://localhost:5173 and **Sign in with Google** (use a Google account
you've added as a test user in Google Cloud Console). Local dev works because
`http://localhost:5173` is an authorized JavaScript origin on the OAuth client.
(Local data is separate from the live site — safe to experiment.)

---

## Make a change and push it live

1. Edit code locally, test at http://localhost:5173.
2. Build the deploy zip (one command):
   ```
   cd D:\ExpensesTracker
   powershell -ExecutionPolicy Bypass -File .\make-deploy-zip.ps1
   ```
   This builds the client and produces `deploy\expenses-tracker-update.zip`
   **(excludes `data/` and `.env`, so live data + secrets are never touched).**
3. cPanel → **File Manager** → upload `expenses-tracker-update.zip` to
   `/home/nipapada/` → right-click → **Extract** → overwrite: **yes to all**.
4. cPanel → **Setup Node.js App** → your app → **Restart**.
5. Check https://nikos-papadakis.com/tracker.

If it errors after restart: File Manager → `/home/nipapada/expenses-tracker/` →
open **`stderr.log`** → read the last ~20 lines (that's where runtime errors go).

---

## Backups (do this regularly)

Your entire dataset is one file: **`/home/nipapada/expenses-tracker/data/data.json`**.

- **Back up:** File Manager → that file → **Download**. Keep the copy somewhere safe.
- **Restore:** upload a saved `data.json` back into the server's `data/` folder
  (overwrite), then **Restart** the app.
- **Start fresh / wipe:** replace `data.json` with one containing only your login
  (regenerate locally: delete `server/data/data.json`, run
  `node scripts/set-password.js nikos '<password>'`, upload the result).

---

## Sign-in & adding people (Google)

Login is **"Sign in with Google"** only — there's no password to manage.

- **Add a new person:** they click *Sign in with Google* once and an empty
  account is created automatically (their own private data). While the Google app
  is in "Testing", first add their Google email as a **test user**: Google Cloud
  Console → APIs & Services → OAuth consent screen → Test users. (Or **Publish
  app** there to let anyone sign in without that step.)
- **The OAuth Client ID** lives in the server `.env` as `GOOGLE_CLIENT_ID`; the
  login page reads it from `GET /api/auth/config`, so there's one source of truth.
- **Authorized origins** on the OAuth client: `https://nikos-papadakis.com`
  (live) and `http://localhost:5173` (dev). No redirect URIs are used.

---

## Server paths / settings reference

| Thing | Value |
|---|---|
| App root | `/home/nipapada/expenses-tracker` |
| Startup file | `app.cjs` |
| Node version | 20 |
| Application URL | `nikos-papadakis.com` + path `tracker` |
| Env file | `/home/nipapada/expenses-tracker/.env` (`NODE_ENV=production`, `JWT_SECRET=...`, `GOOGLE_CLIENT_ID=...`) |
| Data file | `/home/nipapada/expenses-tracker/data/data.json` |
| Runtime error log | `/home/nipapada/expenses-tracker/stderr.log` |
| Server IP | 198.105.112.15 (LiteSpeed) |
| DNS | managed at Hetzner (not cPanel) |

---

## Multi-user

The app is multi-user — each account has its own private data. New accounts are
created automatically the first time someone signs in with Google (see above).

There's no in-app account management anymore (the old **Account** page — add user,
delete user, change password — was removed with the move to Google-only login).
To remove a person, delete their user record and their rows from `data.json`
directly, then Restart.

## Roadmap / ideas not yet built
- Edit expenses inline (currently add/delete only)
- Optional growth/interest rate in the net-worth projection
- Budget targets per category
