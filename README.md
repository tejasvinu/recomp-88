# Recomp 88

Body recomposition tracker built with **Next.js** and **NextAuth**. Supports:

- **Guest mode**: use the app without signing in (data stays local).
- **Accounts**: sign up with email/password or Google.
- **Cloud sync**: signed-in users can sync data to MongoDB.

## Tech stack

- **Next.js** (App Router)
- **React**
- **NextAuth** (JWT session strategy)
- **MongoDB** via **Mongoose**
- **Tailwind CSS**

## Getting started

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

This project reads these variables at runtime:

- `MONGODB_URI`: Mongo connection string (required for sign-up, profiles, and sync).
- `AUTH_SECRET`: NextAuth secret used to sign/encrypt tokens.
- `AUTH_GOOGLE_ID`: Google OAuth client id.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.

If `MONGODB_URI` is missing, database features are disabled (sign-up / profile / sync won’t work).

## Auth & API routes

- **Sign in / sign up UI**: `src/app/auth/signin/page.tsx`
- **NextAuth handler**: `src/app/api/auth/[...nextauth]/route.ts`
- **Register (credentials sign-up)**: `POST /api/auth/register`
- **Cloud sync**: `GET /api/sync`, `POST /api/sync` (requires auth)
- **Profile**: `GET /api/user/profile`, `PATCH /api/user/profile` (requires auth)

## Connected apps and personal API tokens

**Connect to Atlas: Settings → Connected apps → create token, paste URL + token into Atlas Settings → Integrations → Recomp.** Connected apps is also available beside the cloud-backup controls in Profile. Use the API base URL shown there (your Recomp origin, without `/api/v1`). Sign in and sync your data first; the API reads cloud data, not unsynced local workouts.

Each signed-in user can create up to 10 active tokens, for their own apps. Guests must sign in first. Name each token for its app, copy it when created, and keep it private: **you won't see the token again**. Revoke a token in Connected apps to immediately stop its access. Tokens grant only `read:workouts`; they cannot change workouts or account data. Only a SHA-256 hash is stored, with a display prefix, creation time and last-used time. Last-used tracking updates at most once every five minutes.

Token management requires a Recomp session (a bearer token cannot manage tokens):

- `GET /api/tokens` → `{ tokens: [{ id, name, prefix, scopes, createdAt, lastUsedAt }] }`, active tokens only.
- `POST /api/tokens` with JSON `{ "name": "Atlas" }` → `201 { token, id, name, prefix, scopes, createdAt }`. The trimmed name must be 1–60 characters. A full token is `rcp_` followed by 32 random bytes encoded as base64url. The 11th active token returns `409`.
- `DELETE /api/tokens/[id]` revokes an owned token; unknown, revoked, or other users' tokens return `404`.

### Read API v1

Send `Authorization: Bearer rcp_...` on every request. All responses are JSON with `Cache-Control: no-store`. Missing, invalid, revoked or insufficient-scope tokens return `401 { "error": "..." }`; database unavailability returns `503`. Each token is limited to 60 requests per minute (`429` when exceeded), using the existing in-memory limiter per server process.

`GET /api/v1/me` returns:

```json
{
  "schemaVersion": 1,
  "user": { "name": "Alex" },
  "weightUnit": "kg",
  "lastSyncedAt": "2026-10-08T06:12:00.000Z",
  "sessionCount": 42
}
```

The name and last sync time may be `null`. Accounts without synced data have a zero session count. Weight units are `kg` or `lbs`, taken from synced settings (falling back to the profile unit).

`GET /api/v1/sessions?since=ISO&until=ISO` returns:

```json
{
  "schemaVersion": 1,
  "weightUnit": "kg",
  "since": "2026-09-11T00:00:00.000Z",
  "until": "2026-10-09T00:00:00.000Z",
  "sessions": [{
    "id": "abc",
    "startedAt": "2026-10-08T06:12:00.000Z",
    "dayName": "Push A",
    "durationMinutes": 58,
    "exerciseCount": 1,
    "completedSets": 4,
    "totalSets": 4,
    "totalTonnage": 1920,
    "exercises": [{
      "name": "Bench Press",
      "type": "strength",
      "completedSets": 4,
      "totalSets": 4,
      "topSet": { "weight": 80, "reps": 6 }
    }]
  }],
  "bodyWeight": [{ "date": "2026-10-07", "weight": 72.4 }]
}
```

Bounds must be ISO 8601 instants with a timezone; URL-encode offsets containing `+`. `since` is inclusive and `until` exclusive. Defaults are `until = now` and `since = until − 28 days`. Invalid bounds, `since >= until`, or a range longer than 400 days return `400`. Sessions with unparseable dates are skipped; results are sorted by start time ascending and capped at the first 1000.

Duration is rounded from seconds to minutes, or `null` when absent. Tonnage is the stored value or `null`. Completed sets require `completed === true`. An exercise's top set is its completed set with the highest numeric logged weight and reps (ties use more reps), or `null` if no completed set parses. Tagged measurements are converted to the current output unit; legacy measurements lack trustworthy unit metadata. Body weight is sorted by date and filtered by date-string comparison against the synced owner-timezone dates of the bounds (UTC when timezone is absent) (`since` inclusive, `until` exclusive). The API never includes account ids, email, notes, templates or raw progress.

Untagged legacy top sets and tonnage now use the existing `null` values; untagged body-weight rows are omitted. Source numbers remain preserved in storage and backups until the owner confirms their units.

## Version 2 training API

See [docs/api.md](docs/api.md) for read-only training summaries, paginated session and body-weight detail, canonical units, PR calculations, coverage, Atlas consumption, versioned browser sync/reset operations, and authenticated Google linking. Existing personal tokens with `read:workouts` cover these new reads. V1 shapes remain compatible.

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
- `npm test`: run Vitest unit and route tests (no MongoDB required)
