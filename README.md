# HelpingHands Hub

A volunteer shift app built with React, Vite and Express. Volunteers browse drives, sign up for one shift per drive, and see their hours. Organizers confirm who attended, and only confirmed hours count.

Live demo (browser-only mode): https://magenta-kulfi-a9a3bf.netlify.app

## Run it

```bash
npm install
npm run server   # API on http://127.0.0.1:3001, data saved to data/state.json
npm run dev      # app on http://localhost:5173, proxies /api to the server
```

On Windows you can double-click `Open-HelpingHands.bat` to do both.

If the API is not running, the app still works. It runs the same rules in the browser and saves to `localStorage`, and shows a note saying so.

## Production

```bash
npm run build
ORGANIZER_KEY=choose-a-long-random-value NODE_ENV=production HOST=0.0.0.0 npm start
```

The server serves `dist/` and the API from one process.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | 3001 | Port to listen on |
| `HOST` | 127.0.0.1 | Interface to bind |
| `DATA_FILE` | data/state.json | Where state is saved |
| `ORGANIZER_KEY` | unset | Required for attendance changes in production |
| `NODE_ENV` | unset | `production` disables the reset route and requires `ORGANIZER_KEY` |

The static Netlify site has no server, so it runs in browser-only mode.

## Tests

```bash
npm test
```

- `tests/domain.test.js`: sign-up, cancel, attendance, hours, matching and input validation
- `tests/api-local.test.js`: the browser-only store, including corrupted and full storage
- `tests/server.test.js`: HTTP endpoints, status codes, organizer key, concurrent sign-ups, saving to disk

## How it is laid out

```text
shared/domain.js   Rules for sign-ups and attendance. Pure functions, used by server and browser.
shared/seed.js     Sample data: 8 drives, 20 shifts, 35 registrations.
server/            Express API (app.js), file store (store.js), entry point (index.js)
src/api.js         Server client and browser-only fallback with the same methods
src/pages/         Dashboard, Explore, Impact, Organizer
src/components/    DriveCard, DriveModal, ErrorBoundary
tests/
```

## What the rules enforce

- One shift per volunteer per drive, and no sign-up past a shift's capacity.
- A shift cannot be cancelled after attendance is confirmed.
- Attendance cannot be confirmed before the drive date.
- Unknown drives, shifts or malformed input return a clear error and change nothing.
- On a failed action the screen reloads the current data, so it does not show stale spots.

## Security notes

- Request bodies are limited to 10 KB, IDs and emails are validated, and the API is rate limited.
- Helmet sets security headers. Error responses do not include stack traces.
- Attendance changes need `X-Organizer-Key`, compared in constant time.
- The server writes state to a temp file and renames it, and handles writes one at a time, so the last spot in a shift cannot be given to two people.
- All rendering goes through React, which escapes text.

## Known limits

- There are no user accounts. Volunteer actions run as the demo user, Alex Morgan. A real deployment needs login and per-user identity.
- State is one JSON file, which suits a single server. For several servers, move it to a database.
- The organizer key is one shared secret, not per-organizer accounts.
