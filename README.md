# FamilyOS

A calm home base for one household — calendar, groceries, spending, reminders, and
countdowns — as an installable, mobile-first PWA that runs entirely in the browser.

There is no backend. Everything is stored on the device through a small storage
adapter layer, so the app works offline, works with zero configuration, and works
the first time you open it.

## What's inside

| Screen         | What it does                                                                       |
| -------------- | ---------------------------------------------------------------------------------- |
| **Today**      | One scroll: today's events, spend vs. daily budget, grocery count, next countdowns, today's reminders |
| **Calendar**   | Month grid and agenda views, manual event CRUD, Google Calendar events inline (read-only) |
| **Groceries**  | One shared list, auto-grouped by aisle, tap to check off, swipe or long-press to delete |
| **Spending**   | Log expenses by category, Today / Week / Month totals, 30-day trend chart          |
| **Reminders**  | Timed nudges and alarms with optional repeat, delivered by browser notifications    |
| **Countdowns** | Days, hours, and minutes until the things everyone keeps asking about               |
| **Settings**   | Family members, daily budget, Google Calendar connection, reset demo data           |

Family members are labels used for assignment and filtering — there are no accounts
and no login.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173/familyos/
```

That's the whole setup. No environment variables are required; the app seeds a
demo family on first run so every screen has something in it. `Settings → Reset
demo data` puts it back.

```bash
npm run typecheck  # tsc --noEmit
npm run build      # typecheck, then build to dist/
npm run preview    # serve the built bundle
```

### Data and storage

All reads and writes go through `src/lib/storage/`. `StorageAdapter` is the only
interface features know about; `localAdapter.ts` implements it on top of
`localStorage` (namespaced `familyos:*`, with cross-tab sync via the `storage`
event), and `index.ts` picks the active adapter in one swappable function. Features
consume data through the `useCollection(name)` hook — no component imports an
adapter directly. Settings shows a **Local mode** badge so it is always obvious
where the data lives.

## 1. Deploy to GitHub Pages

The build is a static bundle served from a repository subpath, so it uses
`HashRouter` (GitHub Pages has no SPA fallback) and a `base` of `/familyos/`.

1. **Create the repo.** Name it `familyos` — the repo name has to match `base` in
   `vite.config.ts`. If you name it something else, change that one line (and the
   matching `base`, `scope`, and `start_url` in the `VitePWA` config) to
   `/<your-repo-name>/`. GitHub Pages paths are **case-sensitive**: a repo named
   `FamilyOS` needs `/FamilyOS/`. If you deploy to a user or org root page
   (`<username>.github.io`), set them all to `/` instead.

2. **Push the code.**

   ```bash
   git remote add origin https://github.com/<username>/familyos.git
   git push -u origin main
   ```

3. **Turn on Pages.** Repo → **Settings → Pages → Build and deployment → Source:
   GitHub Actions**. There is no branch to pick; the workflow in
   `.github/workflows/deploy.yml` publishes the artifact directly.

4. **Add the Google client ID (optional).** Repo → **Settings → Secrets and
   variables → Actions → Variables → New repository variable**, named
   `VITE_GOOGLE_CLIENT_ID`. Use a **variable, not a secret** — anything prefixed
   `VITE_` is compiled into the public bundle, and a browser OAuth client ID is
   public by design. Skip this entirely if you don't want Google Calendar; the app
   is unaffected and Settings will simply read "Not configured".

5. **Deploy.** Every push to `main` builds and deploys, and you can re-run it by
   hand from the Actions tab (`workflow_dispatch`).

6. **Open it.** The live URL is:

   ```
   https://<username>.github.io/familyos/
   ```

   On a phone, use the browser's **Add to Home Screen** to install it. On iOS this
   is required for notifications to work at all.

## 2. Google Calendar setup

FamilyOS reads Google Calendar directly from the browser with the Google Identity
Services token client and the Calendar REST API — no server, no refresh tokens. The
access token lives in memory and `sessionStorage`, and events are pulled read-only.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a
   project (or pick an existing one).

2. **Enable the API.** APIs & Services → **Library** → search **Google Calendar
   API** → **Enable**.

3. **Configure the consent screen.** APIs & Services → **OAuth consent screen**.
   Choose **External**, fill in the app name and your email, and add the scope
   `https://www.googleapis.com/auth/calendar.readonly`. While the app is in
   **Testing**, add every Google account that will use it under **Test users**.

4. **Create the client.** APIs & Services → **Credentials** → **Create
   credentials** → **OAuth client ID** → Application type: **Web application**.

5. **Add the Authorized JavaScript origins.** Exactly these two — origins only, no
   paths, no trailing slash:

   ```
   http://localhost:5173
   https://<username>.github.io
   ```

   Leave **Authorized redirect URIs** empty; the token client does not use one.

6. **Use the client ID.** Copy it into a repository variable named
   `VITE_GOOGLE_CLIENT_ID` for deploys (step 4 above), and into `.env.local` for
   local development:

   ```bash
   cp .env.example .env.local
   # then set VITE_GOOGLE_CLIENT_ID=... and restart `npm run dev`
   ```

7. **Connect.** In the app: **Settings → Google Calendar → Connect**, then tick the
   calendars to include. FamilyOS caches the next 60 days, refreshes on open when
   the cache is older than 15 minutes, and has a manual refresh button. Google
   events appear inline on the calendar with a dashed treatment and a "Google" tag,
   and cannot be edited from FamilyOS.

## A note on reminders

Reminders are scheduled in the page with `setTimeout` and delivered via the browser
Notification API. That means: **browser notifications only fire reliably while the
app is open or installed as a PWA, and iOS requires the app be added to the Home
Screen.** There is no push server and no background delivery — the same text
appears in Settings so nobody is surprised by it.

## Stack

Vite 5 · React 18 · TypeScript (strict) · Tailwind CSS 3 · React Router 6
(HashRouter) · date-fns · lucide-react · recharts · vite-plugin-pwa · Google
Identity Services + Calendar REST API v3
