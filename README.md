# Expenses Tracker

A personal, single-user expenses & net-worth dashboard. Mobile-first web app.

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node + Express JSON API (`server/`)
- **Database:** SQLite via Prisma (swap to Postgres later with one config change)
- **Auth:** single login, bcrypt-hashed password, cookie session

## Built

**Phase 1 — core tracking**
- Login screen
- Dashboard: monthly income, expenses, normalized subscription cost, net worth,
  and what's left after expenses + subscriptions
- Add / edit / delete **income** (per-month, handles seasonal/variable pay)
- Add / pause / delete **subscriptions** (weekly/monthly/quarterly/yearly →
  normalized to a monthly cost)
- Add / delete **expenses** (dated, categorized)

**Phase 2 — Forecast tab**
- Net-worth projection line chart with a hover crosshair/tooltip
- Adjustable assumptions (current net worth, monthly income, monthly expenses),
  seeded from your historical averages; 6/12/24-month horizons
- "Save as current net worth" records a snapshot that feeds the Dashboard

**Phase 3 — Reports tab + filtering**
- Income-vs-expenses grouped bar chart over 6/12/24 months
- Spending-by-category breakdown and a monthly summary table
- Expenses page: filter by category and date range, with category autocomplete
- CSV **export** and **import** of expenses

## Local development

Two terminals.

### 1. Server

```bash
cd server
npm install
npm run setup                       # generate Prisma client + create the DB
npm run set-password -- me mypass   # create your login (username "me")
npm run seed                        # optional: sample data
npm run dev                         # API on http://localhost:4000
```

### 2. Client

```bash
cd client
npm install
npm run dev                         # UI on http://localhost:5173
```

Open http://localhost:5173 and log in with the username/password you set.
(In dev, the Vite server proxies `/api` calls to the Express server.)

## Production build & deploy (VPS + your domain)

```bash
# 1. Build the client into static files
cd client && npm install && npm run build

# 2. Prepare the server
cd ../server && npm install
npm run setup
npm run set-password -- me a-strong-password

# 3. Set real secrets in server/.env
#    NODE_ENV=production
#    JWT_SECRET=<long random string>

# 4. Run under PM2 (serves API + built client on port 4000)
cd ..
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

Then put **nginx** in front as an HTTPS reverse proxy for your domain:

```nginx
server {
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Get a free HTTPS certificate with `certbot --nginx -d your-domain.com`.
In production the Express server serves the built React app from
`client/dist`, so the whole app is available at your domain.

## Changing your password

```bash
cd server
npm run set-password -- me new-password
```

(Or from the app once a settings screen is added in a later phase.)

## Backups

The entire database is one file: `server/prisma/dev.db`. Copy it to back up.

## Ideas for later

- Optional growth/interest rate in the net-worth projection
- Edit (not just delete) expenses inline; recurring-expense support
- Multi-user accounts (the schema already isolates cleanly per user)
- Budget targets per category with progress bars
