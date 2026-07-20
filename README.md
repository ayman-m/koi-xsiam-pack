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
| Alert triage, investigation & response playbooks | Automatic triage of each KOI alert: item + device investigation, a data-driven verdict, and analyst-gated response (see below) |

## What you can do with it

| Capability | What you get |
|---|---|
| **Telemetry collection** | KOI Alerts + Audit logs into `koi_koi_raw`, normalized and mapped to XDM, queryable in XQL and visualized by the bundled dashboard |
| **Asset & posture visibility** | Everything your workforce runs — browser extensions, IDE plugins, npm/PyPI packages, desktop apps, MCP servers and other agentic-AI assets — per item or per device, with KOI risk scoring |
| **Threat intelligence** | Koidex catalog risk score, findings, compliance data and an AI-generated risk summary for any item |
| **Automated triage** | Every alert classified Benign / Suspicious / Malicious from KOI's alert type and risk level plus the independent catalog risk — benign auto-closes, the rest escalate |
| **Deep investigation** | Per item: catalog risk, AI summary, org exposure, affected endpoints & users, governance state, remediation/approval history. Per device: everything installed on the host and which of it is risky |
| **Analyst-gated response** | A Malicious verdict opens a block approval showing the full investigation; the org-wide blocklist write happens only after a human approves |
| **Proactive hunting** | Scheduled MCP-server audit flags risky agentic-AI assets without waiting for an alert |
| **Fleet script execution** | Run KOI script packages on Cortex-Agent endpoints on a schedule, targeted by OS / group / hostname via a JSON List |

## Quick start

1. **Create a KOI API key** — in the KOI console (requires the `xt-Administrator` role): Settings → API Access → Create new API key.
2. **Configure the integration** — add a KOI instance: Server URL `https://api.prod.koi.security/`, paste the API key, and (XSIAM) enable **Fetch events** for the Alerts/Audit collector. Optional: set a **Tenant Name** label — every event is stamped with `koi_tenant_name` so multiple KOI tenants stay distinguishable.
3. **Verify** — click **Test**, then run:

   ```
   !koi-devices-list limit=5
   ```

> **Egress matters.** KOI applies IP-based restrictions at its edge to the sensitive API endpoints (users, inventory, Koidex, governance). Requests from shared datacenter/cloud egress ranges can return **HTTP 403 even with a valid API key**, while the same key works from a corporate network. Event collection is unaffected. If your tenant egresses from a cloud range, run the integration on a **Cortex engine** whose egress IP KOI accepts. Confirm with `!koi-users-list limit=1`.

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

**Before the first run — referenced by name, NOT shipped in this pack.** Create these on the tenant first, with names matching the List exactly:

- **The KOI script package(s)** — upload to *Action Center → Scripts Library* yourself; the Library name must equal `script.name` character-for-character (or pin `script.uuid` to be rename-proof)
- **The endpoint group(s)** named in `target.endpoint_groups` — must exist and contain the intended agents (connected, unisolated, OS matching `endpoint_os`)
- **The List** — named exactly `Koi Script Runner`
- **A mail-sender instance** (only if notifications are configured) — enabled, supporting `send-mail`; if `sendmail_instance.name` is set, an instance with that exact name

Everything binds by name at run time — renaming any of these without updating the List makes the next run fail or skip (the war-room reason says which reference broke).

## Alert triage, investigation & response

Attach **`KOI - Alert Triage`** to your KOI alerts and each one is investigated, classified and routed automatically:

```
alert → extract koi_context → item investigation → device investigation
      → verdict → Benign: auto-close · Suspicious: leave open
                 · Malicious: raise severity + open an analyst-gated block
```

| Playbook | Role |
|---|---|
| `KOI - Alert Triage` | Main. Orchestrates the flow above |
| `KOI - Extract Alert Context` | Parses the embedded `koi_context` JSON into `KoiContext` |
| `KOI - Investigate Item` | Catalog risk + AI summary, org exposure (installs/signing/publisher/endpoints), affected endpoints & users, blocklist state, remediation & approval history |
| `KOI - Investigate Device` | Everything installed on the affected host, which of it is risky, plus host remediations |
| `KOI - Enrich Item` | Lightweight enrichment (catalog risk + endpoint exposure) |
| `KOI - Block and Remediate` | Investigates, skips already-blocked items, blocks org-wide **only after analyst approval** |
| `KOI - MCP Server Audit` | Scheduled hunt for risky MCP servers |

**Verdict logic** — keyed on KOI's own `alert_type` and `risk_level`, corroborated by the independent Koidex catalog risk:

| Verdict | Condition | Action |
|---|---|---|
| **Malicious** | `alert_type` ∈ {Removed from Marketplace, Publisher Compromised, Unvetted MCP Server}, or `risk_level` High/Critical, or catalog risk high/critical | Raise severity + analyst-gated block |
| **Benign** | `alert_type` = New Item **and** `risk_level` = Low | Auto-close (Resolved) |
| **Suspicious** | anything else (safe default) | Leave open for the analyst |

> **Response safety.** `koi-blocklist-items-add` is the only state-changing action, and it is gated: triage always calls `KOI - Block and Remediate` with `auto_block=false`, so a Malicious verdict parks on an approval task and can never block software without a human decision.

Details in [`Playbooks/README.md`](Playbooks/README.md) and §11 of the customer guide.

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
| Run `KOI - Alert Triage` on a KOI alert | War room shows an item investigation summary, a device investigation summary, and a triage summary with the verdict |
| Let a Malicious verdict reach the block step | Run parks at `runStatus: waiting` on the approval task and `koi-blocklist-items-add` has **not** executed |

## Documentation

The full customer guide — install, configure, all commands, capabilities, the triage/investigation playbooks, validation and troubleshooting:

| Format | File |
|---|---|
| Word | [`docs/KOI_Integration_Customer_Guide_v1.3.0.docx`](docs/KOI_Integration_Customer_Guide_v1.3.0.docx) |
| PDF | [`docs/KOI_Integration_Customer_Guide_v1.3.0.pdf`](docs/KOI_Integration_Customer_Guide_v1.3.0.pdf) |

Regenerate both after editing the content:

```bash
cd docs
node build_guide.js     # content lives here → rebuilds the .docx   (needs the `docx` npm package)
python3 build_pdf.py    # renders the .docx → styled .pdf           (needs pandoc + wkhtmltopdf)
```
