# UCOOK CRM Dashboard

Upload a CSV export of your email campaigns to view KPIs, charts, and download a PDF report.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy the contents of `dist/` to your host.

## Deploying (fixing 404)

- **Vercel / Netlify:** Connect the repo; set build command to `npm run build` and output directory to `dist`. The app has no client-side routes, so the root URL should work.
- **Cloudflare Pages:** Set build command to `npm run build`, output directory to `dist`. The `public/_redirects` file is copied into `dist` so that `/*` → `/index.html` (200) is applied and refreshes on subpaths don’t 404.
- If you still see **404 NOT_FOUND**: ensure the deployment is using the `dist` folder from `npm run build`, not the repo root. The host must serve `index.html` at the site root.
