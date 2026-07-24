# Design — Scan-coverage tracker for large endpoint groups

**Date:** 2026-07-24
**Status:** Approved, building
**Component:** Koi Unified Script Runner playbooks

## Problem

The Script Runner must run the KOI deployment script on every endpoint in a group,
even when the group has 1000+ members. Two platform limits make this hard:

- `core-get-endpoints` rejects any `limit` above **100** — verified:
  `"Search size must fulfill the requirement: 0 < search_size <= 100"` (HTTP 500).
- `core-script-run` **requires explicit `endpoint_ids`** — it cannot target a group,
  so enumeration is mandatory.

The interim 1.4.0 fix capped the query at 100, which scans at most 100 per run and
never covers a larger group. This design gives full, tracked coverage.

## Verified constraints (from the live tenant, 2026-07-23/24)

| Fact | Result |
|---|---|
| `core-get-endpoints` `limit` | hard cap 100 (500 above) |
| `core-get-endpoints` `page`/`page_size` | unreliable — page > 0 returned empty |
| `core-get-endpoints` `first_seen` filter + `sort_by` | **accepted** |
| raw endpoints API sort by `first_seen` asc | monotonic epoch-ms timestamps |
| `core-script-run` targeting | requires explicit `endpoint_ids` |
| `math` / increment automation | absent |
| XQL endpoint roster | not available (no `endpoints` preset) |
| Lists (`getList`) | return full content, no 100-row cap |

## Requirements

- Each endpoint scanned once, then re-scanned only after a configurable interval.
- New endpoints discovered and scanned automatically.
- Per-endpoint tracking: id, name, os, last-scan datetime (a CSV ledger).
- The interval is the reset — no manual campaign reset.
- No false-positive failure emails (the 1.4.0 notification fix is retained).

## The rule

Per endpoint, evaluated at scan time:

```
due = (endpoint not in tracker)              → new: scan and add
    OR (now − last_scan ≥ rescan_interval)   → stale: rescan
    else                                     → skip (scanned recently)
```

## Architecture — two jobs, one shared List

### Shared object: `Koi Scan Tracker` (CSV List)

```
endpoint_id,endpoint_name,os,last_scan
290c8b85...,win-workstation,Windows,2026-07-24T09:41:00Z
```

The only persistent state. No cursor object — the walk cursor lives in-run (below).

### Job A — Refresh Tracker (infrequent, e.g. hourly)

Maintains roster membership. For each List entry (a group + OS scope) it walks the
group by `first_seen` **inside a single run**:

1. local_cursor = 0
2. `core-get-endpoints` — group, platform=os, `first_seen ≥ local_cursor`,
   `sort_by=first_seen asc`, `limit=100`. **No status filter** (membership is
   status-independent; filtering would shrink the 100-window and mis-advance the cursor).
3. Upsert each returned endpoint into the tracker: if `endpoint_id` absent, append a row
   with `last_scan` empty (so it is immediately due). Never touch an existing `last_scan`.
4. local_cursor = max(`first_seen`) in the batch (+1 ms to avoid re-including ties).
5. Batch size == 100 → loop to step 2. Otherwise done.

The loop condition is a count comparison (`count == 100`), needing no arithmetic
automation. One run refreshes the whole roster.

**Append-only**: Refresh never writes `last_scan`, so it cannot clobber Scan's updates.

### Job B — Scan (frequent, e.g. every 30 min)

Runs the script on due endpoints. Per List entry:

1. `getList Koi Scan Tracker` → all rows (no 100 cap).
2. Filter to this OS, compute the **due** set by the rule above using
   `rescan_interval_hours`.
3. Sort due by `last_scan` ascending (most stale first); take the first ≤100.
4. Confirm currently connected: one targeted `core-get-endpoints` by
   `endpoint_id_list` for those ≤100 ids, `status=connected`, `isolate=unisolated`.
   (Targeted lookup, not enumeration.)
5. `core-script-run` on the connected subset.
6. Write `last_scan = now` **only** for endpoints the action dispatched to.
   Offline/failed endpoints stay due and retry next run — "exactly once *successfully*".
7. Report scanned / skipped-recent / new / offline counts.

## New configuration

Per `Koi Script Runner` List entry:

```json
"target": { "...": "...", "rescan_interval_hours": 720 }
```

Per-entry (Windows and macOS can differ). Default 720 (30 days) when omitted. Unit: **hours**.

## Concurrency

Both jobs write the tracker, and `setList` rewrites the whole list, so overlapping
writes can clobber. Mitigations, sufficient for v1:

- Schedule the jobs at non-overlapping times (Refresh on the hour, Scan on the half-hour).
- Refresh is append-only (never writes `last_scan`); Scan only updates `last_scan` of
  existing rows. A lost write self-heals on the next cycle.

## Edge cases

| Case | Handling |
|---|---|
| Endpoint offline when due | Excluded by the connected check; `last_scan` not written; retried next run |
| Endpoint leaves the group | Row lingers, never re-selected. Harmless. Cleanup deferred to v2 |
| `first_seen` ties (bulk enrolment) | Cursor uses `≥` and +1 ms; the tracker upsert dedupes |
| Tracker empty on first Scan (before first Refresh) | Nothing due; Scan is a no-op until Refresh has run once |
| Poll timeout on `core-script-run` | Reported `timed_out`, logged not emailed (retained 1.4.0 fix) |

## Retained from 1.4.0

The notification logic is unchanged: only a genuine dispatch failure (no action created)
emails; a timeout logs a STILL RUNNING entry. Emails carry the endpoint/action detail.

## Scale boundary

Tracker at 1000 endpoints ≈ 60 KB — fine. Past ~10k, whole-list read/write per run gets
heavy and the concurrency race grows likelier; that would need a real datastore. Out of
scope here; documented as the known ceiling.

## Implementation approach (revised — user-approved 2026-07-24)

The tracker's date arithmetic and CSV upsert are done in a single small **automation**
(`KoiScanTracker`), not in playbook DT. Rationale: date-diff and list upsert are trivial and
unit-testable in Python, and fragile/unverifiable in stock transformers through the available
channel. The automation owns all List I/O and the endpoint walk; the playbooks stay thin
orchestration. This adds one code content item (python3 docker) to a previously playbook-only
pack — an accepted trade for reliability and testability.

`KoiScanTracker` is action-dispatched:

- `action=refresh` — enumerate the group via the **raw endpoints API** paged
  `search_from`/`search_to` in 100-row windows (`demisto.internalHttpRequest`, authenticated
  inside the platform), append-only upsert into the tracker List. The `core-get-endpoints`
  **command cannot** page past 100 (its `first_seen` arg does not filter — verified: a pivot
  returned all 7, not 4), which is why refresh uses the raw API. Verified against the tenant:
  windowed paging gives complete coverage (`unique == total_count`).
- `action=select` — read tracker, filter to os, compute the due set (empty `last_scan` or
  `now − last_scan ≥ interval_hours`), sort stale-first, cap at max, confirm currently connected
  via a targeted `core-get-endpoints` by id-list, return the runnable ids.
- `action=mark` — set `last_scan = now` for the given ids in the tracker List.

Pure functions (`parse_tracker`, `emit_tracker`, `compute_due`, `upsert_members`, `mark_scanned`)
are unit-tested locally with no tenant dependency; thin demisto wrappers call `getList`/`setList`/
`core-get-endpoints`.

## Content inventory

| Item | Change |
|---|---|
| `KoiScanTracker` (automation) | **new** — owns tracker List I/O, date logic, the first_seen walk |
| `Koi Unified - Refresh Tracker` | new (Job A entry, loops List entries → `KoiScanTracker action=refresh`) |
| `Koi Unified - Script Runner` | Job B entry (role unchanged) |
| `Koi Unified - Process Config Entry` | `KoiScanTracker action=select` → run → `action=mark` |
| `Koi Unified - Execute Endpoint Script` | takes selected ids, runs, returns dispatched ids |
| `Koi Scan Tracker` (List) | new external prerequisite (CSV) |
| `rescan_interval_hours` | new optional List field, default 720 |

(The separate `Refresh Group Membership` sub-playbook is dropped — the walk lives in the automation.)

## Testing plan (on the ayman tenant, 8 endpoints)

1. Refresh into an empty tracker → all 8 appear with empty `last_scan`.
2. Scan with a small `page`/window forced (e.g. process in batches of 3 by capping the
   due selection) → confirm it walks and marks `last_scan`.
3. Second Scan immediately → all skipped (within interval); zero dispatched.
4. Set `rescan_interval_hours` very low (e.g. 0) → all due again → re-scanned.
5. Offline endpoint due → not marked, stays due.
6. Refresh re-run → no duplicate rows; a newly-added endpoint appears.
7. Notification: a genuine dispatch failure emails; a timeout does not.
