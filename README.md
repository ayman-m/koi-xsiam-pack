# KOI

## Overview

KOI is an endpoint security platform that provides visibility and control over browser extensions, SaaS applications, and web-based threats.

This pack includes an integration that fetches alerts and audit logs from KOI and ingests them into Cortex XSIAM for centralized security monitoring, correlation, and threat analysis.

## What's in the pack

| Component | Purpose |
|---|---|
| KOI integration | Event collector (Alerts + Audit → `koi_koi_raw`) plus 26 commands for devices, inventory, governance, allow/block lists, and the Koidex catalog |
| Koi Parsing / Modeling Rules | Normalize raw KOI events and map them to the Cortex Data Model (XDM) |
| Koi Alerts Dashboard | Ready-made XSIAM dashboard for KOI alert activity |
| Koi Unified Script Runner playbooks | Job-driven, List-configured execution of KOI scripts on Cortex-Agent endpoints (see `Playbooks/README.md`) |

## Quick start

1. **Create a KOI API key** — in the KOI console (requires the `xt-Administrator` role): Settings → API Access → Create new API key.
2. **Configure the integration** — add a KOI instance: Server URL `https://api.prod.koi.security/`, paste the API key, and (XSIAM) enable **Fetch events** for the Alerts/Audit collector. Optional: set a **Tenant Name** label — every event is stamped with `koi_tenant_name` so multiple KOI tenants stay distinguishable.
3. **Verify** — click **Test**, then run:

   ```
   !koi-devices-list limit=5
   ```

## Script Runner playbooks

Three playbooks run KOI script packages (e.g., the KOI deployment script) on Cortex-Agent endpoints on a schedule — attached to a time-triggered **Job** and configured entirely through a JSON **List**, so retargeting never means editing a playbook:

| Playbook | Role |
|---|---|
| `Koi Unified - Script Runner` | Job entry point — loads the `Koi Script Runner` List, loops over entries |
| `Koi Unified - Process Config Entry` | Per entry: `disabled` flag, validation (invalid entries are *reported*), notification, cleanup |
| `Koi Unified - Execute Endpoint Script` | Resolves script name→UUID, targets **connected, unisolated** endpoints by OS/groups/hostnames, runs with polling, returns `ScriptResult` |

Each List entry couples one script with one OS scope — enforced at dispatch time via the endpoint query's platform filter, so a Windows script can never land on a Mac even in a mixed group:

```json
[
  { "script": { "name": "KOI Deployment Script - Windows" },
    "target": { "endpoint_groups": ["KOI Endpoints"], "endpoint_hostnames": [], "endpoint_os": "Windows" },
    "notification": { "sendmail_instance": { "name": "internal-smtp" }, "recipients": ["ops@example.com"] } }
]
```

Optional per entry: `disabled`, `script.uuid`, `script.polling_interval_in_seconds` (60), `script.timeout_in_seconds` (1800). Run outcomes are three-state: **ok** (executed, `action_id` returned, success email), **skipped** (no connected endpoints match the scope right now — info entry, *no* email), or **failed** (real error with a precise reason, failure email). Full details in [`Playbooks/README.md`](Playbooks/README.md) and §10 of the customer guide.

## Deploying this pack to a tenant

**As a single object (recommended for dev/test):** upload `dist/Koi.zip` — either via demisto-sdk:

```bash
export DEMISTO_BASE_URL=https://api-<tenant>... DEMISTO_API_KEY=<standard-key> XSIAM_AUTH_ID=<key-id>
demisto-sdk upload -i Packs/Koi -z --xsiam
```

or, with an **Advanced** API key (which demisto-sdk cannot use), POST the zip with signed headers to
`https://api-<tenant>.../xsoar/contentpacks/installed/upload?skipVerify=true&skipValidation=true`.

To rebuild the zip from source: place this pack at `Packs/Koi/` inside a content-repo scaffold (git repo, `.private-repo-settings`, `Tests/secrets_white_list.json`, and `Packs/ApiModules/Scripts/ContentClientApiModule/` copied from demisto/content), then `demisto-sdk zip-packs -i Packs/Koi -o zipped`.

**Manually (adopt individual items):** import in dependency order — playbooks (executor → processor → main) via Automation → Playbooks → Import; the `Koi Script Runner` List via Settings → Object Setup → Lists; the Job via Automation → Jobs; parsing/modeling rules as user-defined rules targeting `koi_koi_raw`; the dashboard via Dashboards & Reports → Import. Keep item names unchanged — references bind by name.

> Pack-installed items become system-owned: ship later changes as a new pack version (bump `currentVersion`, add a release note, re-upload).

## Validating a deployment

| Check | Evidence |
|---|---|
| `Test` button + `!koi-devices-list limit=5` | Success + a device table |
| XQL: `dataset = koi_koi_raw \| comp count() as events by source_log_type` | Alerts/Audit counts grow between fetch cycles |
| Job → **Run now** → open the run | Work Plan green; `ScriptResult ok:true` + `action_id` per executed entry; `SKIPPED` info entries for OS scopes with no endpoints |
| Action Center → the `action_id` | `COMPLETED_SUCCESSFULLY` on the expected endpoints |
| Koi Alerts Dashboard | Widgets render after ingestion |

The full customer guide (setup, all commands, troubleshooting) lives at
[`docs/KOI_Integration_Customer_Guide_v1.3.0.docx`](docs/KOI_Integration_Customer_Guide_v1.3.0.docx)
(regenerate with [`docs/build_guide.js`](docs/build_guide.js)).
