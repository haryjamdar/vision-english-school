# The Vision English School — Deployment Guide

## What this version does

- React/Vite frontend is built into `dist/`.
- The Node server serves the frontend and the `/api/*` backend from one service.
- Notices, school information, activities and enquiries are stored by the server.
- Admin login uses a server-side `ADMIN_PASSWORD` environment variable and an HTTP-only session cookie.
- No admin password is embedded in the React bundle.

## Local production test

```bash
npm install
set ADMIN_PASSWORD=replace-with-a-strong-password
npm run build
npm start
```

Open `http://localhost:8787`.

PowerShell:

```powershell
$env:ADMIN_PASSWORD="replace-with-a-strong-password"
npm ci
npm run build
npm start
```

## Render deployment

This repository includes `render.yaml`.

1. Push the project to GitHub/GitLab.
2. In Render, create a Blueprint from the repository.
3. Set the `ADMIN_PASSWORD` secret when prompted.
4. Render runs `npm ci && npm run build` and then `npm start`.
5. The service exposes `/api/health` and serves the React site at the same URL.
6. The Render persistent disk is mounted at `/var/data`, so JSON data survives normal redeploys/restarts on the configured disk.

For a free-tier deployment without a persistent disk, do not rely on the JSON file for permanent school records; use a managed database instead.

## Docker

```bash
docker build -t vision-school .
docker run --rm -p 8787:8787 -e ADMIN_PASSWORD="replace-with-a-strong-password" -v vision-school-data:/app/server/data vision-school
```

Open `http://localhost:8787`.

## Security notes

- Set a long unique `ADMIN_PASSWORD` in the hosting provider's secret/environment settings.
- Never put the admin password into `App.jsx`, `.env` files committed to Git, or public documentation.
- The JSON backend is appropriate for a small single-instance deployment with persistent storage. For multiple instances/high availability, migrate the data layer to PostgreSQL/Supabase.
- The current gallery stores uploaded images as Base64 in JSON. Keep uploads small; for a public production site, object storage (S3/Supabase Storage/Cloudinary) is preferable.
