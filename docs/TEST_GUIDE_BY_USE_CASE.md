# KOI pack — test guide by use case

For a person working through the pack on a tenant. Each use case says **why** it matters,
what to **do**, what should **happen**, and what it means when it doesn't.

Work top to bottom the first time — later use cases assume earlier ones passed.

---

## Before you start

| Need | Why |
|---|---|
| Pack installed via `demisto-sdk … --xsiam` | A zip upload lands the content but not working event collection |
| KOI integration instance, test green | Everything except the Script Runner reads the KOI API |
| Egress KOI accepts (or a Cortex engine that has one) | KOI blocks sensitive endpoints by source IP; a wrong egress returns 403 with a valid key |
| **Core REST API** integration enabled | `KoiScanTracker` pages endpoint groups past 100 through it |

> **Check the engine first.** If the instance runs on a Cortex engine and that engine is
> disconnected, every `koi-*` command fails with *"Engine … is not connected"* before it
> reaches KOI. That looks like an integration fault and isn't one.

---

## Generating test data on demand

You don't have to wait for real KOI activity. `TestTools/KoiSimulateEvents` generates
events shaped exactly like real ones and tells you the answers in advance.

```
!KoiSimulateEvents alerts=40 duplicate_factor=8 audit=60
```

Writes to **`koisim_koisim_raw`**, never `koi_koi_raw` — so it can't corrupt real data or
another project's measurements. Query that dataset, or substitute the name into any query
you're testing. It returns the ground truth (distinct alerts, risk mix, how many rows carry
an empty version) so you're checking arithmetic, not impressions.

---

## 1 · Event collection

**Why:** everything downstream reads `koi_koi_raw`. If collection is wrong, every other
result is wrong in a way that looks like a content bug.

**Do**
1. Enable *Fetch events* on the instance, wait two cycles.
2. `dataset = koi_koi_raw | comp count() as rows by source_log_type`

**Expect** — rows under both `Alerts` and `Audit`.

**Then check the counts mean what they say:**
```
dataset = koi_koi_raw | filter source_log_type = "Alerts"
| alter nid = json_extract_scalar(metadata, "$.notification_event_id")
| comp count() as rows, count_distinct(nid) as real_alerts
```
`rows` will be much larger than `real_alerts` — KOI re-sends every still-open alert on each
fetch. **That gap is normal.** `notification_event_id` is the only per-alert identity;
`koi_event_id` is the scan batch and `finding_uid` is the policy. Anything counting alerts
must use `count_distinct` on the notification id.

**If Audit is missing:** the *Audit types* parameter may be narrowed. Empty means all types.

---

## 2 · Alert triage

**Why:** this is the pack's main automation. It must reach a verdict from KOI's real
vocabulary, and must not re-investigate the same alert repeatedly.

**Do**
1. Attach `KOI IR - Alert Triage` to a KOI alert (or `!setPlaybook playbookId="KOI IR - Alert Triage"`).
2. Open the war room.

**Expect**
- A `KoiContext` object with an item id, marketplace, risk level and hostname.
- An investigation summary, then a verdict: **Malicious / Suspicious / Benign**.
- Low-risk items auto-close. Critical/high escalate. Medium and `pending` stay open.

**Why those three:** the verdict keys on `risk_level`, which KOI sends **lowercase**
(`critical`/`high`/`medium`/`low`/`pending`), plus the independent catalog risk.
`pending` means KOI hasn't finished assessing — it deliberately does not auto-close.

**Now test the dedupe.** Run triage twice on alerts sharing one notification id:

**Expect** the second run to stop early with `DUPLICATE — … already triaged on alert <id>`.

**If `KoiContext` is empty:** the alert didn't carry an OCSF payload *and* had no
`koi_context={…}` blob in its description. Check that your correlation rule passes the
KOI fields through. This is the most common cause of "everything comes out Suspicious".

---

## 3 · Investigation depth

**Why:** the verdict is only as good as what's behind it, and an analyst approving a block
needs the whole picture.

**Do** — run `KOI IR - Investigate Item` with an `item_id` + `marketplace`.

**Expect** a `KoiInvestigation` summary carrying catalog risk and AI summary, org exposure
(installs, endpoints, users), and **both** governance counts — `blocklisted_count` *and*
`allowlisted_count`.

**Why both matter:** zero blocklist hits alone doesn't mean "not governed" — it can mean
"somebody explicitly allowed this". Without the allowlist read, an allowlisted item stays a
valid block candidate.

**Device side** — run `KOI IR - Investigate Device` with a device id. Expect everything
installed on that host plus a risky-items table.

**If enrichment is empty but the playbook is green:** that's by design — enrichment is
best-effort. Confirm reachability with `!koi-users-list limit=1`.

---

## 4 · Gated response

**Why:** the only state-changing action in the pack. It must never fire without a human.

**Do** — run `KOI IR - Block and Remediate` with an `item_id` and `marketplace`.

**Expect**
- The run **parks on an approval task**.
- The approval shows catalog + org risk, exposure, remediation history, and the governance
  line — including a warning if the item is **already allowlisted**.
- Nothing is written to the blocklist until someone approves.
- An item already on the blocklist short-circuits instead of being re-added.

**This is the gate to re-run after any change to the response playbook.** If it ever
completes without parking, stop and investigate before using the pack in production.

---

## 5 · Proactive hunting

**Why:** finds risk nobody alerted on.

**Do**
1. `KOI Hunting - MCP Server Audit` — attach to a Job or run directly.
2. Open `docs/xql/` and run a few hunts (start with `H2.1`, `H1.3`).

**Expect** — the audit lists MCP servers at or above the risk threshold. The hunts return
findings KOI scored but nobody actioned.

**Note:** `view=mcp_servers` is now selectable in the argument dropdown; it previously
worked only when a playbook passed it literally. `view=all_items` is accepted by the API
but returns nothing — omit `view` to query everything.

**Query library:** 26 hunts + 46 detections in `docs/xql/`, with
[the operator guide](QUERY_LIBRARY.md) first. They read raw dataset columns, so they don't
depend on the modeling rule.

---

## 6 · Fleet script execution (Script Runner)

**Why:** runs KOI deployment scripts across endpoints on a schedule, and must cover groups
larger than the platform's 100-endpoint query cap.

**Do**
1. Create the JSON List `Koi Script Runner` with `tracker_list` and
   `rescan_interval_hours` set per entry.
2. Run the **Refresh** job (`KOI Script Runner - Refresh Job`) **first**.
3. Then run the **Scan** job (`KOI Script Runner - Scan Job`).

**Expect**
- Refresh fills the tracker List with `endpoint_id,last_scan` rows — it creates the List.
- Scan dispatches to due, connected endpoints and stamps their `last_scan`.
- Offline, wrong-OS and not-in-inventory endpoints stay due and retry next run.
- A second Scan straight after does nothing — everything is inside the rescan interval.

**Why Refresh first:** Scan reads the tracker. An empty tracker means nothing is due, and
the run is a legitimate no-op that can look like a failure.

**Expected non-failures**
- `SKIPPED` — nothing due and connected right now. No email, by design.
- `STILL RUNNING` — dispatched, but polling ended first. Endpoints are already marked;
  Action Center finishes on its own. Not a failure and sends no email.

**If both jobs never run:** confirm each Job is **enabled** and shows a next-run time. A
newly created Job can land disabled.

---

## 7 · Dashboard

**Why:** the numbers get quoted to other people.

**Do** — open the KOI Alerts Dashboard.

**Expect** — alert counts far lower than raw row counts, and stable as fetches repeat.
Every Alerts widget dedupes on the notification id first, so it counts alerts rather than
re-deliveries. If a widget's number climbs steadily while nothing new is happening in KOI,
that widget is counting fetches.

---

## Sign-off

| # | Evidence |
|---|---|
| 1 | Both `Alerts` and `Audit` present; `count_distinct(nid)` well below raw rows |
| 2 | Verdict reached; low risk auto-closes; a repeat notification stops as DUPLICATE |
| 3 | Investigation carries catalog risk **and** both governance counts |
| 4 | Run parks on approval; blocklist untouched until approved |
| 5 | MCP audit returns servers at/above threshold; hunts run |
| 6 | Refresh fills the tracker; Scan marks only due+connected; re-run is a no-op |
| 7 | Alert counts stable across fetch cycles |

All seven → ready for production.

Full detail in the customer guide (`KOI_Integration_Customer_Guide_v1.4.0`). Deeper
diagnostics in the troubleshooting guide.
