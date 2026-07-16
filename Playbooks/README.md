# Koi Unified Script Runner — Playbooks

A unified, job-driven playbook set for periodically executing the KOI deployment
script on Cortex-Agent endpoints. It merges four independently-built playbooks
(NE, the per-OS "Cortex - Trigger Koi Scan" pair, and the MMAA runner bundle)
into one architecture.

## Architecture

```
Job (time-triggered)
 └─ Koi Unified - Script Runner            (main; reads the "Koi Script Runner" List)
     └─ loop: for each configuration entry (separate context per entry)
         └─ Koi Unified - Process Config Entry   (validate, notify, cleanup)
             └─ Koi Unified - Execute Endpoint Script  (resolve UUID, target, run, ScriptResult)
```

## Configuration — the `Koi Script Runner` List (JSON array)

```json
[
  {
    "disabled": false,
    "script": {
      "name": "KOI Deployment Script - Windows",
      "uuid": "",
      "polling_interval_in_seconds": 60,
      "timeout_in_seconds": 1800
    },
    "target": {
      "endpoint_groups": ["KOI Endpoints"],
      "endpoint_hostnames": [],
      "endpoint_os": "Windows"
    },
    "notification": {
      "sendmail_instance": { "name": "internal-smtp" },
      "recipients": ["ops@example.com"]
    }
  }
]
```

Required per entry: `script.name` **or** `script.uuid`, `target.endpoint_os`,
and at least one of `target.endpoint_groups` / `target.endpoint_hostnames`.
Everything else is optional.

## What was taken from each source

| Source | Kept |
|---|---|
| MMAA bundle | 3-tier architecture, List-driven config, per-entry loop with separate context, script name→UUID resolution, `ScriptResult{ok, reason}` contract, per-entry `disabled` flag, context cleanup |
| Cortex per-OS pair | Configurable `polling_interval_in_seconds` / `timeout` on `core-script-run`, error-path discipline (`continueonerrortype: errorPath`), success/failure email content |
| NE - RunKoi | Connected-only + unisolated endpoint filtering before execution |

## Improvements over all four

- One playbook set for every OS — `endpoint_os` is data, not playbook identity
  (kills the Windows/macOS clone pair).
- Invalid config entries are **reported** (`PrintErrorEntry` with the offending
  entry) instead of silently filtered out.
- `script.uuid` supported as an alternative to `script.name` (skips library
  lookup; also disambiguates duplicate names).
- Script-resolution failures return distinct reasons: not found / multiple
  matches / library query failed.
- Notifications are brand-agnostic (`|||send-mail` + optional `using` instance)
  instead of hard-binding one mail integration.
- Per-entry polling/timeout overrides with sane defaults (60 s / 1800 s).
- Three-state result per entry: `ok` (script ran), `skipped` (valid entry but
  no connected endpoints currently match — logged as info, **no failure
  email**), and failed (real error — failure email sent). Keeps recurring
  jobs quiet for not-yet-populated OS scopes without hiding real failures.

## Alert triage playbooks

A second, independent playbook set triages KOI **alerts** ingested into Cortex XSIAM.

| Playbook | Role |
|---|---|
| `KOI - Alert Triage` | Main. Extracts context → enriches via `koi-koidex-risk-report` → computes a verdict → posts a summary → routes (auto-close / escalate / leave open). |
| `KOI - Extract Alert Context` | Sub. Parses the `koi_context={...}` JSON the collector embeds in the alert description into the `KoiContext` object. |

**Verdict logic** (keyed on KOI's own `alert_type` and `risk_level`, with the catalog risk level as a bonus signal):

| Verdict | Condition | Action |
|---|---|---|
| **Malicious** | `alert_type` ∈ {Removed from Marketplace, Publisher Compromised, Unvetted MCP Server}, or `risk_level` High/Critical, or catalog risk high/critical | Raise severity, keep open |
| **Benign** | `alert_type` = New Item **and** `risk_level` = Low | Auto-close (Resolved) |
| **Suspicious** | anything else (safe default) | Keep open for analyst |

Attach `KOI - Alert Triage` to KOI alerts (source `koi`). It reads the alert description from `${incident.details}`; if your alert generation maps the KOI payload to a different field, adjust the `alert_description` input on the extract sub-playbook.

Validated on-tenant against simulated alerts: MCP/removed-from-marketplace → Malicious (escalated), new-low-risk extension → Benign (auto-closed), medium-risk dependency → Suspicious (kept open).

> The triage playbooks call `koi-koidex-risk-report` through a configured KOI integration instance. Enrichment is best-effort (continue-on-error): if the instance can't reach the KOI API, the verdict still resolves from the alert's own fields.

## External prerequisites (referenced by name, not shipped in the pack)

| Dependency | Where | Requirement |
|---|---|---|
| KOI script package(s) | Action Center → Scripts Library | Upload manually; Library name must match `script.name` exactly (or pin `script.uuid`) |
| Endpoint group(s) | Endpoints → Endpoint Groups | Groups in `target.endpoint_groups` must exist and contain the intended agents |
| Target agents | Endpoints | Installed, **connected**, unisolated, OS matching `endpoint_os` — otherwise the entry is `skipped` |
| Configuration List | Settings → Object Setup → Lists | JSON List named exactly `Koi Script Runner` |
| Mail-sender instance | Automation & Feed Integrations | Only for notifications; must be enabled and, when `sendmail_instance.name` is set, match that name exactly |

All references bind by name at run time: renaming any of these without updating the
List configuration causes the next run to fail or skip, with the reason recorded in
the war room.

## Known limitation

The main playbook reads the List named **`Koi Script Runner`** (fixed at the
task level — XSOAR's `${lists.<name>}` accessor cannot be parameterized by a
playbook input). To use a different List name, edit the "Load the …
configuration" task in the main playbook.

## Job setup

Attach **`Koi Unified - Script Runner`** to a time-triggered Job
(Investigation & Response → Automation → Jobs). The playbook closes its own
investigation at the end of every run.
