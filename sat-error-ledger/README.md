# SAT Error Ledger

A calm, two-tab study instrument for SAT prep. It turns mistakes and lucky guesses into lessons you keep, and it shows whether you are showing up week by week.

- **Error Ledger**: a spaced-repetition system for SAT mistakes (four review boxes plus a Mastered archive).
- **Consistency**: your weekly study schedule, session logging, and a gentle weekly history.

It is a static web app (React, TypeScript, Vite, Tailwind CSS, Lucide icons). There is no server, database, account or paid service. Everything you enter is saved in your own browser.

## The review system

New cards start in **Box 1**. When a card is due you try to recall the lesson, reveal it, and then say honestly whether you recalled it. The app never marks a review for you.

| Stage | Wait before the next review |
|---|---|
| Box 1 | 2 days |
| Box 2 | 1 week |
| Box 3 | 3 weeks |
| Box 4 | 8 weeks |

- **Recalled it:** the card moves up one box and is scheduled from the day you reviewed it, using the new box's wait.
- **Passing Box 4:** the card becomes **Mastered**. It stays in the archive and can be reviewed again at any time (a miss sends it back to Box 1).
- **Did not recall it:** the card returns to Box 1 and is due again in 2 days.
- Every review is kept in the card's history. Editing a card's wording never changes when it is due.

## Consistency

The weekly plan is preloaded (the week starts on Monday):

| Day | Session | Planned |
|---|---|---|
| Monday | Math Foundations | 30 min |
| Tuesday | Math Applications & Retrieval | 30 min |
| Wednesday | Rest | none |
| Thursday | Craft & Structure | 30 min |
| Friday | Rest | none |
| Saturday | Retrieval & Information and Ideas | 60 min |
| Sunday | Weekly Mixed Set & Reflection | 60 min |

Weekly target: **5 sessions, 210 minutes (3.5 hours)**.

- Only sessions marked **completed** count toward sessions. A skipped or cut-short session is never counted as completed, but the minutes you actually studied still count toward study time.
- The weekly history shows sessions completed, minutes studied and the percentage of the session target for every week since your first log.
- Insights are descriptive, never guilt-based.

## Run it locally

You need [Node.js](https://nodejs.org/) 22 (20.19 or newer also works).

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:5173
npm test           # run the test suite
npm run typecheck  # type-check the code
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Put it on GitHub Pages (step by step)

GitHub Pages hosts the app for free at `https://<your-username>.github.io/<repository-name>/`. On a free GitHub account the repository must be **public**. Your study data is never in the repository: it lives only in your browser.

1. **Create a GitHub account** at [github.com](https://github.com) if you do not have one.
2. **Create the repository.** Click **New repository** (the **+** menu, top right). Name it, for example, `sat-error-ledger`. Choose **Public**. Leave "Add a README", ".gitignore" and "license" **unchecked**, because this project already has them. Click **Create repository**.
3. **Push this project.** In a terminal, from this project's folder (replace `<your-username>`):

   ```bash
   git init
   git add .
   git commit -m "SAT Error Ledger"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sat-error-ledger.git
   git push -u origin main
   ```

4. **Turn on GitHub Pages.** In the repository, open **Settings**, then **Pages** (left sidebar). Under **Build and deployment**, set **Source** to **GitHub Actions**. There is nothing else to configure.
5. **Watch it deploy.** Open the **Actions** tab. The workflow **Deploy to GitHub Pages** runs on every push to `main`. It installs dependencies, type-checks, runs the tests, builds, and publishes. When it turns green, your site is live at `https://<your-username>.github.io/sat-error-ledger/`. The link also appears in the workflow run, under the **deploy** job.
6. **Use it on your phone.** Open the link and use "Add to Home Screen" for one-tap access.

If the first run failed because Pages was not enabled yet, enable it (step 4), then open **Actions**, choose the failed run and click **Re-run all jobs**.

From then on, every `git push` to `main` redeploys the site.

### How the project is set up for GitHub Pages

- `vite.config.ts` uses `base: './'`, so asset URLs are relative. The site works under `/<repository-name>/` and also on a custom domain, without editing anything when you rename the repository.
- The two tabs use the URL hash (`#/ledger`, `#/consistency`), so refreshing or bookmarking a tab needs no server-side routing and never produces a 404.
- `.github/workflows/deploy.yml` builds with `npm ci` (so `package-lock.json` must stay committed) and deploys the `dist/` folder with the official Pages actions. If GitHub deprecates an action version, bump the version numbers in that file.

## Your data, backups and devices

- Cards, review history and study logs are saved in your browser's **localStorage**. They survive refreshing and closing the browser.
- localStorage belongs to **one browser on one device**. GitHub Pages only serves the app; it does not sync your data between your phone and your computer.
- Open **Settings** (the gear icon) to **export** a JSON backup or **import** one. Import checks the file first, shows what it contains, and asks you to confirm before it replaces anything.
- To move to another device: export on the old one, import on the new one.
- Clearing browsing data, or using a private window, can erase saved data. Export a backup now and then.
- If two tabs of the same browser are open, changes in one appear in the other.

## Project layout

```
src/
  lib/            pure logic: dates, review scheduling, schedule maths, storage and validation (fully tested)
  state/          the data store (React context) and the "today" clock
  components/
    ledger/       Error Ledger tab: stats, due section, card list, form, review and detail dialogs
    consistency/  Consistency tab: week view, session form, weekly history
    ui.tsx        shared buttons, dialog, form fields and other primitives
  index.css       design tokens (colors, fonts, shadows) and animations
```

Things you might want to change:

- **Weekly schedule:** `PLANNED_SCHEDULE` in `src/lib/schedule.ts`. The weekly targets are calculated from it.
- **Review intervals:** `BOX_INTERVAL_DAYS` and `BOX_INTERVAL_LABEL` in `src/lib/srs.ts`.
- **Colors and fonts:** the `@theme` block in `src/index.css`.

## Dates

All dates are calendar dates in your local time zone, stored as `YYYY-MM-DD`. Nothing is converted through UTC, so a review date never shifts by a day because of the time zone or daylight-saving changes. "Today" refreshes at midnight and when you return to the tab.
