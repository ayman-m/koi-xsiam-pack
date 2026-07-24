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
| `KoiScanTracker` automation | Scan-coverage ledger (a CSV List) that lets the Script Runner cover endpoint groups larger than the 100-endpoint `core-get-endpoints` cap. Ships in the pack under `Scripts/`; requires the **Core REST API** integration |
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

Five playbooks plus the `KoiScanTracker` automation run KOI script packages (e.g., the KOI deployment script) on Cortex-Agent endpoints on a schedule — driven by **two** time-triggered Jobs and configured entirely through a JSON **List**, so retargeting never means editing a playbook. Coverage is **tracker-driven**: a per-scope CSV List records when each endpoint was last scanned, so every endpoint is scanned once and then re-scanned only after a configurable interval — and a group larger than the 100-endpoint query cap is still fully covered over successive runs.

| Playbook / Script | Role |
|---|---|
| `Koi Unified - Script Runner` | **Scan** job entry point — loads the `Koi Script Runner` List, loops over entries |
| `Koi Unified - Process Config Entry` | Per entry: `disabled` flag, validation (invalid entries are *reported*), notification, cleanup |
| `Koi Unified - Execute Endpoint Script` | Asks `KoiScanTracker` for up to `max` **due, connected, right-OS** endpoints, runs the script on them, **marks** them scanned, returns `ScriptResult` |
| `Koi Unified - Refresh Tracker` | **Refresh** job entry point — loads the same List, loops over entries |
| `Koi Unified - Refresh Entry` | Per entry: walks the endpoint group (paged past 100 via the Core REST API) and append-only upserts membership into the scope's tracker List |
| `KoiScanTracker` (automation) | Owns the tracker List I/O and the due / connected / OS-safe / mark logic — dispatched as `refresh` \| `select` \| `mark` |

Each List entry couples one script with one OS scope and one tracker List. The `KoiScanTracker` **select** filters its connected-check by `endpoint_os`, so a Windows script can never land on a Mac even if a wrong-OS row ends up in the tracker:

```json
[
  { "script": { "name": "KOI Deployment Script - Windows" },
    "target": { "endpoint_groups": ["KOI Endpoints"], "endpoint_hostnames": [], "endpoint_os": "Windows",
                "tracker_list": "Koi Scan Tracker - Windows", "rescan_interval_hours": 720 },
    "notification": { "sendmail_instance": { "name": "internal-smtp" }, "recipients": ["ops@example.com"] } }
]
```

Required per entry now include **`target.tracker_list`** (the CSV List this scope's coverage is tracked in — the Refresh job creates it if missing) and **`target.rescan_interval_hours`** (hours before a scanned endpoint is due again; default 720). Optional per entry: `disabled`, `script.uuid`, `script.polling_interval_in_seconds` (60), `script.timeout_in_seconds` (1800), `target.max_endpoints` (100, the per-run cap). Run outcomes are three-state: **ok** (dispatched, `action_id` returned, success email), **skipped** (no due, connected endpoints in scope right now — info entry, *no* email), or **failed** (real error with a precise reason, failure email). Mark-on-dispatch means a poll timeout is *not* a failure — it logs STILL RUNNING and never emails. Full details in [`Playbooks/README.md`](Playbooks/README.md) and §10 of the customer guide.

**Before the first run — referenced by name, NOT shipped in this pack.** Create these on the tenant first, with names matching the List exactly:

- **The Core REST API integration** — configured and enabled. `KoiScanTracker` refresh calls `core-api-post` to page the group past the 100-endpoint cap; without it, Refresh cannot build the tracker.
- **The KOI script package(s)** — upload to *Action Center → Scripts Library* yourself; the Library name must equal `script.name` character-for-character (or pin `script.uuid` to be rename-proof). The script must be **parameterless** — the run task passes no `parameters_values`.
- **The endpoint group(s)** named in `target.endpoint_groups` — must exist and contain the intended agents (connected, unisolated, OS matching `endpoint_os`)
- **The List** — named exactly `Koi Script Runner`
- **A mail-sender instance** (only if notifications are configured) — enabled, supporting `send-mail`; if `sendmail_instance.name` is set, an instance with that exact name

> **How coverage works (and why a group over 100 is fine).** `core-get-endpoints` rejects any `limit` above 100 (HTTP 500) and `core-script-run` requires explicit endpoint ids, so a single run cannot cover a bigger group. The tracker solves this with two jobs: the **Refresh** job (`Koi Unified - Refresh Tracker`, infrequent — e.g. hourly) enumerates the whole group paged past 100 into a per-scope tracker List; the **Scan** job (`Koi Unified - Script Runner`, frequent — e.g. every 10 min) takes up to `max` endpoints that are *due* — never scanned, or `last_scan` older than `target.rescan_interval_hours` — dispatches the script, and marks them. Over successive runs the whole fleet is covered, then re-scanned each interval. Schedule the two jobs at non-overlapping times (Refresh is append-only and self-heals, so an occasional overlap is harmless). See `ReleaseNotes/1_5_0.md`.

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

This pack is delivered to customers **directly** — as pack source or a pack zip sent by email. It is not
distributed through the Cortex Marketplace.

> ⚠️ **Do not install the KOI pack from the Cortex Marketplace.** The pack published there is a
> different build, produced by someone else — it is not this pack and its contents and version do not
> match this repository. Install only from the artifact you were sent.

Which path you pick decides whether **event collection works at all**:

| Path | What lands on the tenant | Events flow? | Use when |
|---|---|---|---|
| **`demisto-sdk … --xsiam`** | Everything, at the version you were sent | ✅ | The normal path |
| **Pre-built `dist/Koi.zip`** | Integration + an old 3-playbook Script Runner only | ❌ | Not for XSIAM — see below |
| **Manual per-item** | Only what you import yourself | ❌ unless you add the rules | Partial adoption, e.g. Script Runner only |

> ⚠️ **`dist/Koi.zip` will not collect events.** It was built for a different marketplace target: inside
> it the integration carries `isfetchevents: false`, and it ships **no parsing rules, no modeling rules
> and no dashboard**. Upload it to XSIAM and every
> command works while `koi_koi_raw` stays empty forever — which looks like a collector bug but is just
> the wrong artifact. It is also stale relative to this repo (an old 3-playbook Script Runner, not the current 12 playbooks). For working event
> collection, upload with the SDK.

**With demisto-sdk (the normal path):**

```bash
pip3 install demisto-sdk                      # 1.38+ — older versions reject the platform marketplace
export DEMISTO_BASE_URL=https://api-<tenant>... DEMISTO_API_KEY=<standard-key> XSIAM_AUTH_ID=<key-id>
demisto-sdk upload -i Packs/Koi -z --xsiam
```

The SDK sends the API key as-is, so it needs a **Standard** XSIAM key. With an **Advanced** key the SDK
cannot connect — build the artifact and POST it with signed headers to
`https://api-<tenant>/xsoar/contentpacks/installed/upload?skipVerify=true&skipValidation=true`
(multipart, field name `file`; note the path is `/xsoar/`, not `/xsoar/public/v1/`).

To build from source, place this pack at `Packs/Koi/` inside a content-repo scaffold (git repo,
`.private-repo-settings`, `Tests/secrets_white_list.json`, and `Packs/ApiModules/Scripts/ContentClientApiModule/`
copied from demisto/content), then `demisto-sdk zip-packs -i Packs/Koi -o zipped`.

**Manually (adopt individual items):** import in dependency order — the `KoiScanTracker` automation, then
the playbooks called-before-caller (Execute Endpoint Script → Process Config Entry → Refresh Entry →
Refresh Tracker → Script Runner) via Automation → Playbooks → Import; the `Koi Script Runner` List via
Settings → Object Setup → Lists; the **two** Jobs (Scan + Refresh) via Automation → Jobs; parsing/modeling
rules as user-defined rules targeting `koi_koi_raw`; the dashboard via Dashboards & Reports → Import. Keep
item names unchanged — references bind by name.

> Pack-installed items become system-owned: ship later changes as a new pack version (bump `currentVersion`, add a release note, re-upload).

### Just the Script Runner — the minimal install

If all you want is to **run KOI scripts on endpoints from a scheduled Job**, you do not need the rest of
the pack. These playbooks call **no `koi-*` command at all** — only `core-get-scripts`, `core-get-endpoints`,
`core-script-run` and `core-api-post` — so there is no KOI API key, no KOI integration instance, no
parsing/modeling rules and no dashboard involved. The one integration you **do** need is the built-in
**Core REST API** (for `core-api-post`, used by Refresh to page the group past 100).

Import exactly these six content items plus the List, **in this order** (everything binds by name, so import
what gets called before what calls it — automation first, then leaf sub-playbooks, then their parents):

| # | Item | Where |
|---|---|---|
| 1 | `KoiScanTracker` (automation) | Automation → Scripts → Import |
| 2 | `Koi Unified - Execute Endpoint Script` | Automation → Playbooks → Import |
| 3 | `Koi Unified - Process Config Entry` | Automation → Playbooks → Import |
| 4 | `Koi Unified - Refresh Entry` | Automation → Playbooks → Import |
| 5 | `Koi Unified - Refresh Tracker` | Automation → Playbooks → Import |
| 6 | `Koi Unified - Script Runner` | Automation → Playbooks → Import |
| 7 | `Koi Script Runner` (JSON List) | Settings → Object Setup → Lists → New List |

Then create **two** Time-triggered Jobs (Automation → Jobs → New Job):

- **Scan** — playbook `Koi Unified - Script Runner`, frequent (e.g. every 10 minutes).
- **Refresh** — playbook `Koi Unified - Refresh Tracker`, less frequent (e.g. hourly).

The per-scope tracker Lists (e.g. `Koi Scan Tracker - Windows`, named by each entry's `target.tracker_list`)
are **created automatically** by the first Refresh run — you do not pre-create them.

What you still need on the tenant: the **Core REST API integration** enabled; the **KOI script package** in
Action Center → Scripts Library (its name must equal `script.name` in the List exactly, or pin `script.uuid`;
it must be **parameterless**); an **endpoint group** containing connected, unisolated agents matching
`target.endpoint_os`; and — only if you configure notifications — an enabled **mail-sender instance**.

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

| Document | What it is | Formats |
|---|---|---|
| **Customer guide** | Install, configure, all 26 commands, capabilities, the playbooks, validation and troubleshooting | [Word](docs/KOI_Integration_Customer_Guide_v1.4.0.docx) · [PDF](docs/KOI_Integration_Customer_Guide_v1.4.0.pdf) |
| **Overview deck** | 12-slide introduction to the pack, for briefings and demos | [PPTX](docs/KOI_Content_Pack_Overview.pptx) · [PDF](docs/KOI_Content_Pack_Overview.pdf) |
| **Test guide** | Requirements, install and nine tests with steps and expected results | [PPTX](docs/KOI_Content_Pack_Test_Guide.pptx) · [PDF](docs/KOI_Content_Pack_Test_Guide.pdf) |
| **Troubleshooting guide** | Diagnostic channels, KOI's on-disk file map, how each data point is collected, and symptom/cause/fix | [Word](docs/KOI_Troubleshooting_Guide_v1.0.docx) · [PDF](docs/KOI_Troubleshooting_Guide_v1.0.pdf) |

The **test guide** is the fastest way to confirm a deployment: it walks connectivity,
event collection, the command surface, the dashboard, triage, both investigations,
the analyst gate, the scheduled hunt and the Script Runner job — with one line of
evidence per test to sign off against.

Regenerate any of them after editing the content:

```bash
cd docs
node build_guide.js       # content lives here → rebuilds the .docx  (needs the `docx` npm package)
python3 build_pdf.py      # renders the .docx → styled .pdf          (needs pandoc + wkhtmltopdf)
node build_deck.js        # rebuilds the overview .pptx              (needs the `pptxgenjs` npm package)
node build_test_guide.js  # rebuilds the test-guide .pptx            (needs the `pptxgenjs` npm package)

# decks → PDF (LibreOffice)
soffice --headless --convert-to pdf KOI_Content_Pack_Overview.pptx KOI_Content_Pack_Test_Guide.pptx
```
