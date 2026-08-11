# Deploying to cPanel

Your host runs cPanel with Node.js support, so this uses cPanel's **Setup Node.js
App** tool (Phusion Passenger). It runs the app and manages HTTPS for you — no
PM2, nginx, or certbot needed.

The upload bundle is **`deploy/expenses-tracker.zip`**. Rebuild it any time with
`npm run build` in `client/`, copy `client/dist` to `server/public`, and re-zip
the `server/` contents (see "Updating later" at the bottom).

---

## Step 0 — Confirm you have what you need

1. Log in to cPanel.
2. Under **Software**, look for **"Setup Node.js App"**. If it's there, you're
   good. If it's missing, your plan doesn't have Node support — tell me and we'll
   look at alternatives.
3. Note your server's IP: cPanel home → sidebar → **Shared IP Address** (or
   General Information). You'll need it for DNS.

## Step 1 — Point your domain at the server (DNS)

You said the domain isn't pointing here yet. Pick one:

- **Use a subdomain** (recommended, cleanest): in cPanel → **Domains** →
  **Create A New Domain**, add e.g. `tracker.yourdomain.com`. If the parent domain
  already lives on this cPanel account, DNS is automatic.
- **Use the main domain / a domain hosted elsewhere**: at your domain
  **registrar**, create an **A record** pointing the name (e.g. `tracker`) to the
  **Shared IP** from Step 0. DNS can take from minutes up to a few hours.

Verify it resolves before continuing:
`ping tracker.yourdomain.com` should show your server's IP.

## Step 2 — Upload and extract the code

1. cPanel → **File Manager**.
2. Go to your home directory (e.g. `/home/USERNAME`). *Do not* put the app inside
   `public_html` — Passenger apps live outside the web root.
3. **Upload** `expenses-tracker.zip`.
4. Right-click it → **Extract**. You'll get `/home/USERNAME/expenses-tracker`
   containing `app.cjs`, `src/`, `public/`, `prisma/`, `scripts/`, `package.json`.

## Step 3 — Create the Node.js application

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| **Node.js version** | 18 or newer (20 recommended) |
| **Application mode** | Production |
| **Application root** | `expenses-tracker` |
| **Application URL** | your domain/subdomain from Step 1 |
| **Application startup file** | `app.cjs` |

Click **Create**. cPanel shows a command to enter the app's environment, like:
`source /home/USERNAME/nodevenv/expenses-tracker/20/bin/activate && cd /home/USERNAME/expenses-tracker`
Copy it — you'll use it in Step 5.

## Step 4 — Set environment variables

Easiest: create a `.env` file so both the app and the Prisma CLI see the values.

1. File Manager → open `expenses-tracker` → rename **`.env.example`** to **`.env`**
   (or copy it). Enable "Show Hidden Files" if you don't see it.
2. Edit `.env` and set a real secret. Generate one locally and paste it:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   ```
   NODE_ENV=production
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="<the long random string you generated>"
   ```

## Step 5 — Install deps + set up the database

Open cPanel → **Terminal** (or SSH). Paste the `source …` activate command from
Step 3, then run:

```bash
npm install                    # installs deps + fetches the Linux Prisma engine
npx prisma generate            # generate the DB client
npx prisma db push             # create the SQLite database
node scripts/set-password.js nikos 'Nikolaos05!'   # your login
# optional demo data (skip for a clean start):
# node scripts/seed.js
```

> No Terminal on your plan? Use **Setup Node.js App → Run NPM Install** for the
> first line. For the Prisma/password lines, the Node App page also has a
> **"Run JS script"** field — but Terminal/SSH is much easier. If neither exists,
> tell me and I'll give you a workaround.

## Step 6 — Start it and enable HTTPS

1. Back on **Setup Node.js App**, click **Restart** so it picks up the new files
   and `.env`.
2. HTTPS: cPanel **AutoSSL** usually issues a certificate for your domain
   automatically within a bit. Check **Security → SSL/TLS Status**; if needed,
   select the domain and **Run AutoSSL**.

## Step 7 — Open it

Visit **https://tracker.yourdomain.com** on your phone or laptop and log in with
`nikos` / `Nikolaos05!`. That's it — it's live.

---

## Updating later

When you change the app:

1. Locally: `cd client && npm run build`, then copy `client/dist` → `server/public`.
2. Upload the changed files (or a fresh zip) via File Manager, overwriting.
3. If you changed the database schema, re-run `npx prisma db push` in the terminal.
4. **Setup Node.js App → Restart.**

Your data lives in `expenses-tracker/prisma/dev.db` — **back it up by downloading
that file** from File Manager now and then. Re-uploading the bundle never touches
it unless you overwrite it.

## If something's off

- **502 / app won't start** → Setup Node.js App shows logs; also check
  `stderr.log` in the app root. Usually a missing `.env` or a Node version < 18.
- **Login works but "Session expired" immediately** → `JWT_SECRET` not set, or the
  site isn't on HTTPS yet (the cookie is HTTPS-only in production).
- **Blank page, API 404s** → make sure `public/` uploaded and the startup file is
  `app.cjs`.
