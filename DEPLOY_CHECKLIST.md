# Fix before deploy

Things to handle before this goes live on your domain. None block local use.

- [ ] **Set a real `JWT_SECRET`** in `server/.env` — it's currently the
      placeholder `change-me-to-a-long-random-string`. Anyone who knows the
      placeholder could forge a login cookie. Generate one:
      `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
      then paste it into `server/.env` as `JWT_SECRET=...`

- [ ] **Set `NODE_ENV=production`** in `server/.env`. This makes the login
      cookie `secure` (HTTPS-only) and serves the built client from Express.

- [ ] **Clear the seed/sample data.** The seeded Netflix/Spotify/gym subs,
      seasonal income, and the 8,500 € net-worth snapshot are fake demo data.
      Delete them in the app, or start from a clean DB:
      delete `server/prisma/dev.db`, then `npm run setup` (do NOT run
      `npm run seed`), then set your password again with `npm run set-password`.

- [ ] **Serve over HTTPS.** Put nginx in front as a reverse proxy and get a free
      Let's Encrypt cert (`certbot --nginx -d your-domain.com`). Steps are in
      README.md. Logging in over plain HTTP would send your password in the clear.

- [ ] **Confirm the DB file is backed up / not web-served.** `server/prisma/dev.db`
      is your entire dataset — back it up by copying the file. It's already in
      `.gitignore` and lives outside `client/dist`, so it isn't exposed.

## Login

Current login: **nikos** / **Nikolaos05!**
Change anytime: `cd server && npm run set-password -- nikos <new-password>`
