# Self-hosted database (libSQL on a VPS)

[中文](self-hosted-libsql.md)

By default the Worker stores everything in Cloudflare D1. D1's free plan has hard daily caps (5M rows read, 100k rows written), and once a cap is reached D1 rejects queries until 00:00 UTC. This optional mode moves the database to **your own VPS**, which has no row caps. The Worker still runs on Cloudflare, so video keeps streaming through Cloudflare's network and not through the VPS.

- It is opt-in. Setting the `LIBSQL_URL` secret switches to the VPS; without it, D1 is used as before.
- Same SQL, same data. libSQL (`sqld`) is SQLite, so nothing in the app changes.
- A small VPS is enough (1 vCPU, 512 MB RAM). Oracle Cloud Always Free works.

## What happens if the VPS goes down

- **Proxying and playback keep working.** The Worker keeps the last good route config in memory and, on a custom domain, in Cloudflare's cache, and serves from it. It retries the database every 10–30 seconds and picks up again once the VPS is back.
- **Paused until the VPS is back:** the admin panel, viewer logins, saving viewer watch progress, and stats/logging.
- The cache copy only works on a **custom domain**. On `*.workers.dev`, Cloudflare's cache is disabled, so a freshly started Worker instance can't restore routes while the database is down. An instance that already loaded them keeps working.

## 1. Generate the access token (on your computer)

```bash
node scripts/libsql-keygen.mjs
```

This prints two lines:

- `SQLD_AUTH_JWT_KEY=…` is the public key for the VPS. It can only verify tokens, not create them.
- `LIBSQL_AUTH_TOKEN=…` is the token for the Worker. Keep it secret.

The private key is discarded after it signs the token. To rotate, run the script again and update both sides.

## 2. Start the database on the VPS

You need Docker, and a domain name such as `db.example.com` pointing (DNS **A record**) at the VPS. Open ports 80 and 443.

```bash
mkdir -p /opt/emby-db && cd /opt/emby-db
# copy deploy/libsql/{docker-compose.yml,Caddyfile,backup.sh} from this repo here, then:
cat > .env <<'EOF'
SQLD_AUTH_JWT_KEY=<from step 1>
LIBSQL_AUTH_TOKEN=<from step 1>
DB_DOMAIN=db.example.com
EOF
chmod 600 .env
docker compose up -d
```

This runs `sqld` with its data in `./data`, and Caddy, which gets an HTTPS certificate for `DB_DOMAIN` automatically. `sqld` itself only listens on `127.0.0.1`. If the DNS record is proxied by Cloudflare (orange cloud), set SSL/TLS mode to **Full (strict)**.

Check it: `curl https://db.example.com/health` should return HTTP 200. Queries without the token get 401.

## 3. Copy your data from D1

Do this at a quiet time. Anything written to D1 after the export (visitor logs, watch progress) is not copied.

```bash
npx wrangler d1 export emby-proxy-db --remote --output d1.sql   # use your D1 database name
LIBSQL_URL=https://db.example.com LIBSQL_AUTH_TOKEN=<token> node scripts/libsql-import.mjs d1.sql
```

The import runs as one transaction: it either copies everything or nothing, and it refuses to run on a database that already has tables. **Import before step 4.** Once the Worker is pointed at the empty database, it creates empty tables there itself.

## 4. Point the Worker at the VPS

```bash
npx wrangler secret put LIBSQL_URL          # https://db.example.com
npx wrangler secret put LIBSQL_AUTH_TOKEN   # the token from step 1
```

Or use Cloudflare dashboard → Workers → your Worker → Settings → Variables and Secrets. This takes effect on the next request; no redeploy is needed. Keep the D1 binding in `wrangler.toml`; it's simply unused while `LIBSQL_URL` is set.

Open the admin panel and check your nodes are there.

## 5. Backups

`backup.sh` saves a compressed SQL dump to `backups/` and keeps the latest 14. Add it to the VPS crontab:

```bash
15 3 * * * cd /opt/emby-db && ./backup.sh >> backup.log 2>&1
```

To restore: start an empty database, then `gunzip -c backups/<date>.sql.gz > restore.sql` and import it with `scripts/libsql-import.mjs` as in step 3. Also copy backups off the VPS from time to time.

## Switching back to D1

```bash
npx wrangler secret delete LIBSQL_URL
```

The Worker uses D1 again right away. Anything written while on the VPS stays in the VPS database. If you need it in D1, back it up with `backup.sh`, then:

```bash
gunzip -c backups/<date>.sql.gz | grep -v -e '^BEGIN TRANSACTION;' -e '^COMMIT;' -e '^PRAGMA foreign_keys' > to-d1.sql
npx wrangler d1 execute <db> --remote --file to-d1.sql   # into an empty D1 database
```

## Limits that still apply

- Workers Free plan limits: 100k requests/day, 10 ms CPU per request, and 50 outgoing requests per request. Each database query counts as one outgoing request. Normal requests make only a few.
- Latency: each database query is a round trip from Cloudflare to the VPS. Pick a VPS region close to your users. Route lookups are cached for 60 seconds, so normal proxying rarely waits on it.
