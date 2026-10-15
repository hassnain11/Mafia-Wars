# Deploy Mafia Wars (Fly.io + Cloudflare Pages)

End-to-end steps to put Mafia Wars on the public internet.

- **Server:** Fly.io (free tier — no cold-start, perfect for WebSocket games)
- **Client:** Cloudflare Pages (free, no card)
- **Repo:** GitHub (free)

Allow about 30 minutes for the first time.

---

## 1. Push to GitHub

### 1.1 Create the repo
1. Open <https://github.com/new>
2. Repository name: `mafia-wars` (or anything)
3. Public or private — your choice. Cloudflare Pages works with both.
4. **Do not** initialize with a README, .gitignore, or license (we already have them).
5. Click **Create repository**.

### 1.2 Push from your machine
Copy the repo URL GitHub shows (looks like `https://github.com/<you>/mafia-wars.git`). In this project folder:

```bash
git remote add origin https://github.com/<you>/mafia-wars.git
git branch -M main
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens → fine-grained, repo scope).

---

## 2. Deploy the server to Fly.io

### 2.1 Install flyctl (Windows)
Open **PowerShell** and run:

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Then restart your terminal so `flyctl` is on PATH. Verify:

```bash
flyctl version
```

### 2.2 Sign up / log in
```bash
flyctl auth signup
```

- A browser opens → sign up with GitHub/Google/email.
- Add a credit or debit card (required for verification, no charge on free tier).

### 2.3 Launch the app
From the project root:

```bash
flyctl launch --no-deploy
```

- When it asks "App name": accept the default or type your own (e.g. `mafia-wars-xyz`). Save it — this becomes `<app>.fly.dev`.
- Region: pick one near you (fra = Frankfurt is good for Pakistan).
- Postgres / Redis: **no**.
- "Would you like to deploy now?": **no** (we'll set secrets first).

This updates `fly.toml` with your real app name. Commit the change:

```bash
git add fly.toml && git commit -m "fly: set app name" && git push
```

### 2.4 Deploy
```bash
flyctl deploy
```

First deploy takes 3–5 minutes (building the Docker image). Watch for `Monitoring deployment` and `successful`. The URL is shown — something like `https://mafia-wars-xyz.fly.dev`.

### 2.5 Smoke test the server
```bash
curl https://<your-app>.fly.dev/healthz
```

Should return `{"ok":true}`.

---

## 3. Deploy the client to Cloudflare Pages

### 3.1 Sign up
1. Open <https://dash.cloudflare.com/sign-up>
2. Email + password — no card needed.

### 3.2 Create a Pages project
1. In the sidebar: **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize Cloudflare to read your GitHub.
3. Pick the `mafia-wars` repo.
4. **Build settings:**
   - Production branch: `main`
   - Framework preset: **Vite**
   - Build command: `npm install && npm run build --workspace=client`
   - Build output directory: `client/dist`
   - Root directory: *(leave blank — root of repo)*
5. **Environment variables:** add one for Production:
   - Key: `VITE_SERVER_URL`
   - Value: `https://<your-app>.fly.dev` (from step 2.4)
6. Click **Save and Deploy**.

First build takes ~2 minutes. When it finishes, Cloudflare shows your URL — something like `https://mafia-wars.pages.dev`.

---

## 4. Wire CORS between the two

The server has to allow the Cloudflare URL to connect.

```bash
flyctl secrets set CLIENT_ORIGIN=https://mafia-wars.pages.dev --app <your-app>
```

Fly automatically restarts the machine. Check it came back up:

```bash
flyctl status --app <your-app>
```

---

## 5. Play

Open the Pages URL on two devices (or two browsers) and start a lobby. Share the code with friends.

### Troubleshooting

- **"WebSocket connection failed"** — CORS. Re-check step 4; the value must be exactly the Pages URL with `https://` and no trailing slash.
- **Server shows "cold start" for the first request** — Fly machines auto-stop after idle; the first request wakes them in ~1s. Set `min_machines_running = 1` in `fly.toml` (already set) to keep one awake.
- **Changes don't appear on Pages** — Cloudflare auto-deploys on every push to `main`. Check the Deployments tab.
- **Changes don't appear on Fly** — redeploy with `flyctl deploy`.

### Updating later

- **Server code change** → push to GitHub → `flyctl deploy`
- **Client code change** → push to GitHub → Cloudflare auto-rebuilds

---

## Alternative hosts

If Fly's card verification is a blocker, see `DEPLOY-RENDER.md` (coming soon) for a Render.com + UptimeRobot setup. Trade-off: ~30s cold start when idle more than 15 minutes.
