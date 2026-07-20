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

This pack is delivered to customers **directly** — as pack source or a pack zip sent by email. It is not
distributed through the Cortex Marketplace.

> ⚠️ **Do not install the KOI pack from the Cortex Marketplace.** The pack published there is a
> different build, produced by someone else — it is not this pack and its contents and version do not
> match this repository. Install only from the artifact you were sent.

Which path you pick decides whether **event collection works at all**:

| Path | What lands on the tenant | Events flow? | Use when |
|---|---|---|---|
| **`demisto-sdk … --xsiam`** | Everything, at the version you were sent | ✅ | The normal path |
| **Pre-built `dist/Koi.zip`** | Integration + the 3 Script Runner playbooks only | ❌ | Not for XSIAM — see below |
| **Manual per-item** | Only what you import yourself | ❌ unless you add the rules | Partial adoption, e.g. Script Runner only |

> ⚠️ **`dist/Koi.zip` will not collect events.** It was built for a different marketplace target: inside
> it the integration carries `isfetchevents: false`, and it ships **no parsing rules, no modeling rules
> and no dashboard**. Upload it to XSIAM and every
> command works while `koi_koi_raw` stays empty forever — which looks like a collector bug but is just
> the wrong artifact. It is also stale relative to this repo (3 playbooks, not 10). For working event
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

**Manually (adopt individual items):** import in dependency order — playbooks (executor → processor → main)
via Automation → Playbooks → Import; the `Koi Script Runner` List via Settings → Object Setup → Lists; the
Job via Automation → Jobs; parsing/modeling rules as user-defined rules targeting `koi_koi_raw`; the
dashboard via Dashboards & Reports → Import. Keep item names unchanged — references bind by name.

> Pack-installed items become system-owned: ship later changes as a new pack version (bump `currentVersion`, add a release note, re-upload).

### Just the Script Runner — the minimal install

If all you want is to **run KOI scripts on endpoints from a scheduled Job**, you do not need the rest of
the pack. The three Script Runner playbooks call **no `koi-*` command at all** — only `core-get-scripts`,
`core-get-endpoints` and `core-script-run` — so there is no KOI API key, no integration instance, no
parsing/modeling rules and no dashboard involved.

Import exactly these four items, **in this order** (sub-playbooks bind by name, so a parent imported first
points at something that does not exist yet):

| # | Item | Where |
|---|---|---|
| 1 | `Koi Unified - Execute Endpoint Script` | Automation → Playbooks → Import |
| 2 | `Koi Unified - Process Config Entry` | Automation → Playbooks → Import |
| 3 | `Koi Unified - Script Runner` | Automation → Playbooks → Import |
| 4 | `Koi Script Runner` (JSON List) | Settings → Object Setup → Lists → New List |

Then create the Job: Automation → Jobs → New Job, **Time-triggered**, playbook `Koi Unified - Script Runner`.

What you still need on the tenant: the **KOI script package** in Action Center → Scripts Library (its name
must equal `script.name` in the List exactly, or pin `script.uuid`), an **endpoint group** containing
connected, unisolated agents matching `target.endpoint_os`, and — only if you configure notifications — an
enabled **mail-sender instance**.

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
| **Customer guide** | Install, configure, all 26 commands, capabilities, the playbooks, validation and troubleshooting | [Word](docs/KOI_Integration_Customer_Guide_v1.3.0.docx) · [PDF](docs/KOI_Integration_Customer_Guide_v1.3.0.pdf) |
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
