# Atlas training API and sync contract

## Authentication and compatibility

All public reads require an existing personal token with `read:workouts`:
`Authorization: Bearer rcp_...`. Create/revoke tokens through Connected Apps.
Token hashes, revocation, scope checks and the existing 60 requests/minute/process
limit apply to v1 and v2. Every public response uses `Cache-Control: no-store`.
These routes cannot modify workouts, plans, notes or live progress.

The v1 response shapes and `schemaVersion: 1` remain unchanged. For records with
explicit units, v1 converts measurements into its top-level `weightUnit`, rather
than relabelling them. Untagged historical top sets/tonnage return null; untagged
body-weight rows are omitted because v1 cannot express a null weight. These use
the existing v1 nullable fields/array shapes. Its session window now uses an observed start when present;
legacy `date` remains the fallback. Weight-date bounds use synced owner timezone,
falling back to UTC when absent. V1 still has its historical 1,000-session cap and
cannot express per-record legacy-unit uncertainty or authentic start-time quality. Prefer v2
for new Atlas evidence and trends.

## Capability discovery

`GET /api/v2/me` returns an opaque, stable `accountKey`, the authorized
`read:workouts` scope, owner timezone (nullable), `revision`, `lastSyncedAt`,
`supportedSchemas: [1,2]`, `calculationVersion: "training-2"` and capabilities:

```json
{
  "schemaVersion": 2,
  "accountKey": "rcpa_example-opaque-account-key",
  "user": { "name": "Example Owner" },
  "authorizedScope": "read:workouts",
  "timezone": "Asia/Calcutta",
  "capabilities": ["training-summary-v2", "session-details-v2", "body-weight-v2", "revision-bound-pagination"],
  "supportedSchemas": [1, 2],
  "calculationVersion": "training-2",
  "revision": 12,
  "lastSyncedAt": "2026-10-09T18:42:00.000Z"
}
```

The example identities are synthetic. IANA aliases are canonicalized by the
runtime; `Asia/Kolkata` and `Asia/Calcutta` are equivalent. Explicitly pass the
Atlas owner's timezone on history requests, especially if Recomp has no synced
timezone yet. If neither query nor settings supplies a timezone, history uses UTC.

## Session detail and weekly training load

`GET /api/v2/training/summary?from=2026-10-05&to=2026-10-11&timezone=Asia%2FKolkata&limit=20`

`GET /api/v2/sessions` provides the same envelope and calculations. Its cursors
are independent of summary cursors. `from` and `to` are inclusive calendar dates,
not instants. Defaults cover the latest 28 calendar days. Maximum range: 366
days; `limit` defaults to 20 and must be 1–50. Invalid dates, impossible dates,
timezones, ranges or limits return 400.

The response includes paginated `sessions`, `personalRecords` belonging to those
sessions, full-range `weeklyTrainingLoad`, `page`, `coverage`, `revision`,
`accountKey`, `lastSyncedAt`, `massUnit: "kg"`, and `volumeUnit: "kg_reps"`.
Example session (all fields shown):

```json
{
  "id": "push-1-1791562800000",
  "version": 1,
  "date": "2026-10-09",
  "timezone": "Asia/Calcutta",
  "sourceTimezone": "Asia/Calcutta",
  "startedAt": "2026-10-09T18:20:00.000Z",
  "endedAt": "2026-10-09T18:40:00.000Z",
  "recordedAt": "2026-10-09T18:41:00.000Z",
  "updatedAt": "2026-10-09T18:41:00.000Z",
  "timestampQuality": "observed",
  "planDay": { "id": "push-1", "name": "Push" },
  "planVersion": "plan-1-example",
  "scheduledOccurrenceId": null,
  "durationSeconds": 1200,
  "bodyWeightKg": 80,
  "exercises": [{
    "id": "push-1-press",
    "displayName": "Bench Press",
    "type": "strength",
    "sets": [{
      "id": "set-1", "completed": true, "setType": "working", "isExtra": false,
      "targetReps": "5", "reps": 5, "loadKg": 40, "loadKind": "external",
      "offsetKg": null, "sourceUnit": "kg", "volumeKgReps": 200,
      "rpe": 8, "completedAt": "2026-10-09T18:35:00.000Z", "measurementQuality": "known"
    }],
    "coverage": { "totalSets": 1, "returnedSets": 1, "complete": true }
  }],
  "volumeKgReps": 200,
  "knownVolumeKgReps": 200,
  "completionQuality": {
    "recordedSets": 1, "completedSets": 1, "completedWorkingSets": 1,
    "completedWarmupSets": 0, "plannedWorkingSets": 3, "completedPlannedSets": 1,
    "plannedCompletionRatio": 0.3333333333333333,
    "attendanceEligible": true,
    "attendancePolicy": "at_least_one_completed_non_warmup_set",
    "unknownLoadSets": 0
  },
  "detailCoverage": {
    "totalExercises": 1, "returnedExercises": 1, "totalSets": 1,
    "returnedSets": 1, "complete": true
  }
}
```

This session crosses local midnight. Its `date` comes from the observed start;
elapsed duration and the original start are stored independently of timer pauses.
`observed` means the app timer start, currently triggered by the first completed
set. Legacy save times are `recorded_only` with `startedAt: null`; manual past
entries are `date_only` and retain their entered calendar label. A date-only
label cannot be translated into a different timezone without inventing a time.
Source timezone and timestamp quality explain that limitation. `updatedAt` is
nullable for legacy records; the API never invents a per-session update time.

New workouts preserve the plan's sets when the timer starts; workouts without a
timer use the template snapshot at save. The denominator includes unrecorded
planned sets and excludes extras. `plannedWorkingSets` and completion ratio are
null for legacy sessions without a snapshot. No dated schedule exists, so the
envelope always reports:

```json
{"adherence":{"status":"unconfigured","scheduledOccurrences":null,"completedOccurrences":null}}
```

Recorded set completion is not schedule adherence. Attendance requires at least
one completed non-warmup set, independent of whether its load/reps are measurable.
Draft-only sessions remain visible with `attendanceEligible: false`.

Numeric logs must be finite nonnegative decimal numbers. Reps must be positive
integers. Uncompleted sets, invalid logs and unknown units do not contribute
measured volume or PRs. Working/drop/failure sets count as non-warmup sets. Session
and weekly volume include completed resistance sets, excluding warmups and
`type: "other"`; per-set warmup volume remains separately inspectable.

`loadKind` is `external`, `bodyweight`, `bodyweight_added` or
`bodyweight_assisted`. BW/+/- offsets use the session's frozen body-weight
snapshot, never a later measurement or an invented default. Missing BW or units
produce null load/volume. Canonical kg uses exactly 0.45359237 kg per pound.
`knownVolumeKgReps` sums measurable sets; `volumeKgReps` is null if any completed
resistance working set is unmeasurable. It must not be treated as zero.

PRs compare stable exercise IDs and load kinds, using all earlier eligible cloud
history, including sessions before `from`. Names are display text and are never
used to join lifts. The first eligible record has `previousValue: null`; it is a
baseline, not proof of an all-time first performance. Metrics are `max_load` and
`estimated_1rm`. Epley estimates use `loadKg * (1 + reps/30)` for external loads
with 1–15 reps; higher reps and BW sets produce no estimated max. Calculation
method is `epley_cap15`. PRs have stable IDs, exercise/session/set IDs, explicit
unit/value/prior value, achieved time and timestamp quality. Date-only PRs have
null achieved time. Example PR:

```json
{
  "id": "example-opaque-record-id", "exerciseId": "push-1-press",
  "sessionId": "push-1-1791562800000", "setId": "set-1",
  "metric": "max_load", "loadKind": "external", "value": 40,
  "previousValue": 35, "unit": "kg",
  "achievedAt": "2026-10-09T18:20:00.000Z", "timestampQuality": "observed"
}
```

Weeks start Monday in the requested timezone. Aggregates include every matching
session, even when detail is paginated or capped. Boundary weeks include only the
requested dates and have `completeWeek: false`. Example aggregate:

```json
{
  "weekStart": "2026-10-05", "from": "2026-10-05", "to": "2026-10-11",
  "sessionCount": 1, "attendedSessions": 1,
  "completedWorkingSets": 1, "completedWarmupSets": 0,
  "knownVolumeKgReps": 200, "unknownLoadSets": 0,
  "volumeKgReps": 200, "completeWeek": true
}
```

## Pagination and coverage

Sessions sort by local date, source start/save instant, then stable ID. Cursors
bind the authenticated account, endpoint, calculation version, revision, timezone
and dates. Pass `cursor` with the same filters to continue. A dataset change or
changed binding returns 409 `cursor_changed`: discard partial detail and restart.
No historical snapshot is retained. Cursors are selectors, not credentials.

```json
{"page":{"limit":20,"returned":20,"total":42,"hasMore":true,"nextCursor":"opaque-base64url-cursor"}}
```

Detail caps are 50 exercises and 500 sets per session, with a 2 MB response budget.
The budget can reduce returned session count below `limit`. `page.returned`,
`hasMore` and `nextCursor` always describe the actual page. Oversized legacy IDs
are mapped to stable opaque hashes. Names/target-rep text are bounded.

Coverage names the `cloud_ledger_only` scope and `observationCoverage: "unknown"`:
a successful API request is not proof that every real workout was recorded or
that an offline device synced. `lastSyncedAt` is the cloud write time, not phone
coverage. Coverage counts discarded/invalid-date sessions, sessions with unknown
load/plan/timestamp quality, date-only sessions and detail truncation. Counts
describe the whole range except `detailTruncatedSessionIds`, which describes the
current page. `detailPageComplete` is true only when this page covers all matching
sessions. Inspect each session/exercise's detail coverage before using raw arrays
as complete history. Aggregate coverage explicitly states that all matching
sessions were included.

## Independent body-weight history

`GET /api/v2/body-weight?from=2026-10-03&to=2026-10-09&timezone=Asia%2FKolkata`
uses the same date/window/limit validation and independent revision-bound paging.
Both calendar endpoints are inclusive. Date-only readings retain the original
stored label/timezone; a requested timezone does not shift that label.

```json
{
  "schemaVersion": 2, "accountKey": "rcpa_example-opaque-account-key",
  "revision": 12, "from": "2026-10-03", "to": "2026-10-09",
  "timezone": "Asia/Calcutta", "massUnit": "kg",
  "items": [{
    "id": "weight:2026-10-09", "date": "2026-10-09",
    "timezone": "Asia/Calcutta", "requestedTimezone": "Asia/Calcutta",
    "timestampQuality": "date_only", "kilograms": 80,
    "sourceValue": 80, "sourceUnit": "kg",
    "recordedAt": "2026-10-09T06:00:00.000Z", "updatedAt": "2026-10-09T06:00:00.000Z"
  }],
  "page": {"limit":20,"returned":1,"total":1,"hasMore":false,"nextCursor":null},
  "coverage": {"scope":"cloud_ledger_only","observationCoverage":"unknown","unknownUnitEntries":0,"dateSemantics":"inclusive_stored_calendar_labels"}
}
```

Legacy unknown units produce `kilograms: null` and preserve the source number
with `sourceUnit: null`. Changing display preference never assigns units to old
records. Unverified legacy values are also withheld from display conversion and
weight trends; their original numbers remain in local/cloud storage and JSON
backups. Confirm historical units before any owner-directed correction/import.

## Atlas consumption

1. Negotiate v2 via `/api/v2/me`; retain the existing v1 connector fallback.
2. Key evidence by accountKey, timezone, calculationVersion and connection
   generation. When revision changes, reconcile cached periods, including old
   weeks affected by deletion/reset. Revision alone is an invalidation hint;
   there is no incremental change feed in this branch.
3. Paginate detail until `hasMore` is false, restarting on 409. Upsert by stable
   session ID. Never add repeated full-range weekly aggregates across pages.
4. Use `attendanceEligible` for the documented attendance metric. Use completed
   working-set counts or canonical volume for separately defined commitments.
   Keep missing unit/load/plan values unknown; expose sync age and coverage.
5. Fetch body weight with its own local-date bounds. Keep original timezone,
   precision, units and update provenance.

Public validation errors use
`{schemaVersion:2,error:{code,message,retryable}}`. Cursor conflicts are retryable
by restarting; query errors are not. Authentication/rate/database failures retain
the existing safe 401/429/503 string-error contract.

## Browser sync operations

`GET/POST /api/sync` require a browser session, not a personal token. New clients
send `baseRevision` plus `syncState`:

```json
{
  "baseRevision": 12,
  "syncState": {"epoch":0,"tombstones":{"deleted-session-id":2}},
  "sessions": []
}
```

Session versions default to 0 for legacy data. A tombstone removes equal/older
versions; it persists on the cloud and locally. Undo restores the same ID with a
strictly higher version. Absence alone never deletes. Clear Data sends an explicit
single-use operation:

```json
{
  "baseRevision": 12,
  "syncState": {"epoch":0,"tombstones":{},"reset":{"id":"unique-reset-operation-id","baseEpoch":0}},
  "workoutTemplate": [], "progress": {}, "sessions": [],
  "bodyWeightEntries": [], "exerciseNotes": {}, "customExercises": [],
  "settings": {"weightUnit":"kg","strengthRestDuration":120,"hypertrophyRestDuration":90,"soundEnabled":true}
}
```

Reset replaces the snapshot, increments `epoch`, and records `resetId`. Replaying
that reset is idempotent and cannot clear later writes. Old-generation uploads
return 409 `reset_conflict`, including legacy clients after a reset. New clients
must hydrate the current generation before upload. Never automatically rebase an
old full snapshot onto a new epoch. Successful writes return the existing
`ok/lastSyncedAt` plus `revision` and authoritative `data`. Writes use an atomic
revision predicate and retry at most five times; exhaustion returns 409
`revision_conflict`. Concurrent first inserts retry duplicate-key conflicts.

New clients send their expected `accountId`; an authenticated session for a
different account returns 403 `account_changed`. GET acknowledges its account
identity too. Transport metadata is kept outside the workout snapshot to avoid
spurious changes. A newer local reset queued while a push is in flight survives
that older acknowledgement.

Pushes are serialized and delayed responses are account-bound. An empty cloud
read is successful empty hydration; an unavailable cloud read does not enable
upload. The app indicates a queued cloud reset until it is acknowledged, and
persists pending reset/deletion intent for retries.

## Google identity linking and owner deployment notes

Google sign-in requires a verified Google email and stable provider subject.
An unbound password account is refused regardless of its providers array,
including previously auto-linked ambiguous accounts. Existing Google-only
accounts bind their subject on the next verified sign-in. Once bound, another
subject with the same email cannot enter.

To intentionally link a password account, authenticate with credentials, then
POST `/api/auth/link/google` from the same origin with `{ "password": "..." }`.
After `ok: true`, initiate the normal NextAuth `signIn("google")` flow in that
same browser. A signed HttpOnly, five-minute cookie plus a single-use database
nonce proves fresh password reauthentication. The callback atomically consumes
that proof and links only the matching owner/email. This endpoint does not expose
the password, nonce or subject in its response. No linking UI is added by this
branch; integrations must perform these two explicit browser steps.

No offline database migration is required. Missing revisions/epochs are treated
as 0 and become explicit on the next successful write. New measurement metadata
is additive; historical unit/time uncertainty remains unfilled. Before owner
deployment, review any credentials+Google accounts created under the old silent
linking behavior and invalidate existing JWT sessions if needed (rotate AUTH_SECRET
through normal deployment configuration). This code cannot determine which old
passwords were legitimate. Keep AUTH_SECRET stable after the intended rotation;
it also signs the short-lived linking proof.

Deploy the server and refreshed client together; refresh installed PWAs/open tabs
before using reset operations. Old clients can safely read v1 but cannot upload
pre-reset generations. Rollback to the old sync writer after a reset is unsafe,
because it does not enforce tombstones or generations. Atlas upgrades are a
separate owner-reviewed change. Tests/builds for this branch use fixtures or
disabled database configuration; no deployment, live migration or live-service
verification is part of this work.
