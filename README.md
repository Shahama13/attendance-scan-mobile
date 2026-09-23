# Attendance Scan — Supervisor Mobile App

React Native (Expo) app for site supervisors, per Section 4.2 of the spec: log in, scan
the day's sheet, review/correct the OCR extraction, and submit — wired to the real
backend API and OCR microservice from `attendance-record-backend`, not a mock.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS), or press `a` / `i` for an emulator.

Before running, point the app at your backend in `app.json`:

```json
"extra": { "apiBaseUrl": "http://<your-machine's-LAN-IP>:4000/api" }
```

`localhost` won't work from a physical device or most emulators — it needs to resolve to
the machine actually running the API. Use your LAN IP for a real device, or
`http://10.0.2.2:4000/api` for the Android Studio emulator specifically.

Log in with one of the seeded supervisor accounts from the backend
(`sup.north` / `sup.south`, password `ChangeMe123!`).

## Sites vs. campuses

The backend has a two-level hierarchy: a **site** (e.g. "UTAS Nizwa") has multiple
**campuses** (e.g. "North Campus", "South Campus") under it. A supervisor account is
scoped to one campus — their `campusId`/`campusCode`/`campusName` come back from
`POST /api/auth/login` and `GET /api/auth/me`, and every endpoint the app calls
(roster, OCR scan, submit, history) is scoped by `campusId`, not by the old flat
"site" concept. The app never needs to know which parent site its campus belongs to.

## Screens

- **Login** — authenticates against `POST /api/auth/login`, stores the JWT
- **Home** — today's submission status, a short "recent submissions" preview
  (`GET /api/attendance`), and the offline sync banner
- **Capture** — camera or photo library → `POST /api/ocr/scan`
- **Review** — every active employee on the roster, pre-filled from the OCR result;
  rows the OCR wasn't confident about are outlined in amber; a banner appears if the
  sheet's printed "Total Manpower Present" doesn't match what was actually signed.
  Submits to `POST /api/attendance`
- **Scans** — every scan ever submitted for the supervisor's campus, in one place,
  newest first, paginated (`GET /api/attendance`, scoped server-side to their campus).
  Reached via "View all scans" on Home.
- **Scan detail** — one submitted sheet's full per-employee breakdown (present/absent,
  clock in/out, signature match score if one was computed) plus its verification
  status. Read-only — there's no endpoint to edit a sheet after submission, only to
  verify it (admin/HR, from the web portal). Reached by tapping any row on Home or
  Scans. (`GET /api/attendance/:id`)
- **Change password** — current/new/confirm fields, `PATCH /api/auth/change-password`.
  Reached via "Change password" next to "Log out" on Home. Same endpoint and same
  400-not-401-on-wrong-password behavior as the web portal's version.

## Offline capability

Per spec Section 4.2: if a submit fails because the device has no connectivity, the
sheet is saved to a local queue (`src/utils/offlineQueue.js`, backed by AsyncStorage)
instead of being lost. The queue is retried automatically every time the Home screen
loads, and can be retried manually by tapping the "waiting to sync" banner. A submit
that fails for a real server-side reason (e.g. someone already submitted that campus's
sheet for the day) is *not* queued — that's surfaced to the supervisor immediately,
since retrying it would never succeed.

## What's implemented vs. what's a stub

**Implemented and wired to the real backend:** login/session persistence, camera and
photo-library capture, the OCR review-and-correct flow, submission, duplicate-sheet
handling, full scan history with a per-sheet detail view, offline queueing with retry.

**Not implemented — flagged rather than faked:**
- **Biometric login** (spec says "username/password or biometric if supported") —
  password auth only. Adding Face ID / fingerprint would mean `expo-local-authentication`
  gating the stored JWT.
- **Push notifications** ("remind supervisors to scan if not submitted") — not built.
  Would need `expo-notifications` plus a small scheduler on the backend.
- **Uploading the original sheet photo** — the review screen submits the corrected data
  but does not yet upload the image itself anywhere; `imageUrl` is sent as `null`. The
  backend has nowhere to put it yet either (see the backend README's "file storage" gap)
  — wiring one to the other is the natural next piece.
- **App icon / splash art** — `app.json` references `./assets/icon.png`, which isn't
  included; drop in real artwork before a real build.

## Building an installable APK/IPA

This ships as Expo source, not a compiled binary — producing an actual `.apk`/`.ipa`
needs an Expo (EAS) account and a real Apple/Google developer account for signing,
neither of which this environment has. Once you have those:

```bash
npx eas build --platform android
npx eas build --platform ios
```