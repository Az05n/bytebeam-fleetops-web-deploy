# FleetOps — Bytebeam Fleet Intelligence

A dark-mode fleet operations dashboard built with React + TypeScript, Vite, Tailwind CSS, Supabase Auth, and React Leaflet. The app is designed as a real operations console for monitoring fleet health, vehicle movement, trip progress, and attention-needed alerts.

## Product overview

FleetOps provides an operational view for dispatch teams and fleet admins. The interface combines:

- a protected login flow backed by Supabase Auth
- a fleet map with vehicle markers and trip polylines
- KPI cards for fleet health, movement, attention, and trip throughput
- a searchable and filterable vehicle list
- a selected-vehicle details panel
- trip history and alert summaries based on real or seeded fleet data

The frontend is intentionally structured to support an operations workflow rather than a marketing landing page. It centers the dashboard around a fleet data snapshot, map context, and operational actionability.

## Technology stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- React Leaflet + Leaflet + OpenStreetMap tiles
- Supabase JavaScript client
- Lucide React icons

## Features implemented

- polished dark operations-console layout
- protected dashboard route with auth restoration on refresh
- graceful handling when Supabase environment variables are missing
- login page with validation and user-friendly errors
- interactive map showing fleet markers and route polylines
- vehicle selection sync between map and list details panel
- route, fuel, and status metrics from seeded fleet and trip records
- a manual refresh action for reloading the fleet snapshot
- responsive dashboard layout for desktop and tablet/mobile screens
- SQL schema and seed scripts ready for a fresh Supabase project

## Local setup

1. Clone or open the project folder.
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Add your Supabase values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_anon_key_here
```

5. Start the dev server:

```bash
npm run dev
```

## Environment variables

The app expects the browser-safe Supabase values in the frontend env file:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These must be the public anonymous key for the client-side app. Do not use the service role key or any secret in the frontend.

## Supabase setup

### Connect the existing project

This workspace is configured for Supabase project reference `iihxyiiocpicvnzvxkru`. The schema and seed were applied to that project after confirming the public schema had no existing relations or policies. Remote verification returned 10 vehicles, 12 trips, and 37 trip points. Do not rerun `supabase/seed.sql` on this populated project.

1. Open the existing project in the Supabase dashboard. For a different fresh project, create it first and use its own Project URL and public browser key.
2. In Project Settings > API, copy the Project URL and the publishable/anon browser key. Never use the service-role key in this frontend.
3. In the project root, copy `.env.example` to `.env` if needed and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never commit or include `.env`; restart the dev server after changing values.
4. Before applying SQL to any existing project, inspect its tables, policies, and data in SQL Editor. On a fresh project only, run `supabase/schema.sql` first and `supabase/seed.sql` second. The seed uses plain inserts and must not be rerun after its records exist.
5. The current project has all three tables, foreign keys, indexes, and RLS policies verified. Anonymous reads return no rows; authenticated read policies allow fleet data access.

### Authentication setup

1. In Authentication > Sign-in / Providers, enable Email and password authentication.
2. In Authentication > URL Configuration, set the local Site URL to `http://localhost:5173` while testing locally and add `http://localhost:5173/**` to the redirect URL allowlist.
3. Create a test user under Authentication > Users (or use the permitted sign-up flow in your project), then sign in through the app.
4. For deployment, add the exact production origin and `https://YOUR_DEPLOYED_DOMAIN/**` to the redirect URL allowlist, and set the Site URL to the production origin. Replace the example host with the real deployed domain.
5. Verify sign-in, refresh/session restoration, access to the protected dashboard, data reads, and logout in the configured project.

The current client does not use an application-specific OAuth callback route; Supabase Auth restores its session from the browser URL/storage using its standard client behavior.

## Database model and schema

The app uses a simple relational model with three main tables:

- `vehicles` — current fleet positions, operating state, fuel, battery, and driver information
- `trips` — trip metadata including route summary, distances, speeds, and trip status
- `trip_points` — waypoint data used to draw the trip route on the map

Relationships:

- `trips.vehicle_id` → `vehicles.id`
- `trip_points.trip_id` → `trips.id`

The schema file is at `supabase/schema.sql` and the seed data is at `supabase/seed.sql`.

## Row Level Security and access assumptions

This prototype follows a simple authenticated-operations-user model:

- anonymous users cannot read or write any fleet data
- authenticated users can read vehicle, trip, and trip-point data
- no unrestricted public write policy is enabled

This keeps the prototype aligned with the assignment requirement for secure access without exposing sensitive database operations to unauthenticated users.

## Map library and tile service

The map is built using React Leaflet with OpenStreetMap tiles:

- `react-leaflet` for map rendering
- `leaflet` for markers, popups, and polyline overlays
- OpenStreetMap tile service for map basemap data

Leaflet's stylesheet is loaded once by the app entry point. The map has an explicit responsive container size and observes container resizes to keep tile layout correct as the dashboard changes size.

This is a reliable map stack for a prototype and is fully suitable for local development and deployment in a frontend-only app.

## Architecture and tradeoffs

The app intentionally favors a simple, production-minded architecture:

- local demo fallback data keeps the interface usable when Supabase config is not present
- actual Supabase queries are used when the env vars are available; query failures are shown rather than disguised with demo records
- the dashboard is driven by a single fleet data fetch layer, reducing duplication and allowing a consistent schema contract
- the UI uses a single dark theme and minimal additional dependencies to keep the app fast and easy to maintain

Potential tradeoff: the app uses seeded offline sample data in the default preview mode rather than a remote database until the user configures Supabase. This keeps the product usable in a local environment while still supporting real data integration when credentials are added.

## Known limitations

- The app is deployed at [https://bytebeam-fleet-management.vercel.app](https://bytebeam-fleet-management.vercel.app). The production URL and direct SPA routes were verified over HTTPS.
- The dashboard uses fallback demo data when Supabase env vars are missing.
- The login form is fully wired to Supabase Auth only when the proper client credentials are configured.
- Fleet data is a manually refreshed snapshot; Supabase Realtime subscriptions and live GPS telemetry are not implemented.
- The app owner confirmed a real Supabase user sign-in, and an earlier browser check observed the dashboard session surviving a refresh. Logout is now local-session scoped; recheck it from a signed-in browser before deployment.

## Deployment instructions

### Vercel

1. Authenticate with the Vercel CLI and deploy the local source directly using `npx vercel deploy --prod`. This does not require a GitHub import or push.
2. The included Vercel configuration explicitly sets `npm run build`, output directory `dist`, and a rewrite to `index.html` for SPA routes.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings. These are public browser-side values and are included in the client bundle; never use a service-role key.
4. The production project has both values configured for Production, Preview, and Development. Add `https://bytebeam-fleet-management.vercel.app` as the Supabase Authentication Site URL and allowlist `https://bytebeam-fleet-management.vercel.app/**` under Authentication > URL Configuration.
5. Production app URL: [https://bytebeam-fleet-management.vercel.app](https://bytebeam-fleet-management.vercel.app).

Do not deploy with real credentials embedded in source or commit a real `.env` file.

### Netlify

1. From the project directory, authenticate with your Netlify account and deploy the local source using Netlify CLI (`npx netlify deploy --build`, then `npx netlify deploy --build --prod` after reviewing the draft deploy).
2. The included `netlify.toml` configures build command `npm run build`, publish directory `dist`, and the SPA fallback.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Netlify site environment variables.
4. Add the final Netlify domain to Supabase Authentication > URL Configuration as described above.

The production deployment was created from this workspace with the Vercel CLI; the repository was not pushed to GitHub.

## AI usage

This project used GitHub Copilot and the VS Code AI assistant for scaffolding, debugging, TypeScript resolution, and documentation drafting.

See `docs/AI_USAGE.md` for the workflow template and instructions for how to share or export chat links manually.

## Live demo status

Production deployment is verified at [https://bytebeam-fleet-management.vercel.app](https://bytebeam-fleet-management.vercel.app). Root, login, and direct SPA routes returned HTTP 200. A signed-out visitor is redirected to the login page. Authenticated production sign-in and database reads still require a user login test on that domain.

## Verification

This workspace has verified:

- TypeScript compilation and the production build succeed via `npm run build`
- lint succeeds via `npm run lint`
- the dashboard renders with the configured app structure
- the app handles missing Supabase configuration gracefully
- configured Supabase query errors are surfaced in the dashboard rather than silently replaced by demo data
- the existing Supabase project previously returned 10 vehicles, 12 trips, and 37 trip points in SQL Editor; its Table Editor currently lists all three expected public tables
- unauthenticated PostgREST reads using the public publishable key returned HTTP 200 with zero rows for all three tables, as expected under the anonymous-deny RLS policies
- the local environment points to the existing Supabase project and uses a public publishable key; the signed-out app redirects to the login page
- the Vercel production project is configured with the public Supabase variables and the deployed app returns HTTP 200 for `/`, `/login`, `/trips`, and `/alerts`
- the map has been browser-tested for continuous tiles, responsive sizing, zoom/pan, and marker popups

The app owner confirmed successful email/password sign-in in the local app and an earlier browser check observed a restored session and fleet data after refresh. Production authentication and authenticated database reads have not yet been tested in the deployed browser session. The Supabase dashboard reported an active service issue during a later audit, so remote SQL counts and policies were not freshly rechecked during that pass. Logout is scoped to the current browser session and should be confirmed on the production domain after login.
