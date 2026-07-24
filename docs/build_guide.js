/* Build "KOI Integration for Cortex XSIAM — Customer User Guide" (.docx) */
const {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, LevelFormat,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableOfContents, TableRow, TextRun, VerticalAlign, WidthType,
} = require("docx");
const fs = require("fs");

const ORANGE = "E8551F";
const SLATE = "1F2937";
const GRAY = "6B7280";
const LIGHT = "F3F4F6";
const HEADER_BG = "334155";
const CONTENT_W = 9360; // Letter, 1" margins

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, ...(opts.spacing || {}) },
    alignment: opts.align,
    children: [new TextRun({ text, size: opts.size || 22, bold: opts.bold, italics: opts.italics, color: opts.color || SLATE, font: opts.font || "Calibri" })],
    ...(opts.para || {}),
  });

const rich = (runs, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, ...(opts.spacing || {}) },
    children: runs.map(r => new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })),
  });

const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 32, color: ORANGE, font: "Calibri" })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, bold: true, size: 26, color: SLATE, font: "Calibri" })] });

const bullet = (t, opts = {}) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(r => new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })),
    ...opts,
  });

let __stepInstance = 0;
// Each numbered list gets its own numbering instance so every section restarts at 1.
const newStep = () => {
  const instance = ++__stepInstance;
  return t =>
    new Paragraph({
      numbering: { reference: "steps", level: 0, instance },
      spacing: { after: 80 },
      children: (Array.isArray(t) ? t : [{ text: t }]).map(r => new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })),
    });
};
const step = newStep();

const code = t =>
  new Paragraph({
    spacing: { after: 60 },
    shading: { type: ShadingType.CLEAR, fill: LIGHT },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text: t, font: "Consolas", size: 19, color: "111827" })],
  });

const cell = (t, { w, header = false, bold = false, mono = false } = {}) =>
  new TableCell({
    width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: header ? { type: ShadingType.CLEAR, fill: HEADER_BG } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: t, size: header ? 21 : 20, bold: header || bold, color: header ? "FFFFFF" : SLATE, font: mono ? "Consolas" : "Calibri" })],
    })],
  });

const table = (widths, rows) =>
  new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((t, j) => cell(t, { w: widths[j], header: i === 0, bold: r.__bold && j === 0, mono: i > 0 && r.__mono === j })),
    })),
  });

// command table row helper: first col monospace
const cmdRow = (cmd, desc) => { const r = [cmd, desc]; r.__mono = 0; return r; };

const hr = new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } }, children: [] });

/* ---------------- Cover ---------------- */
const cover = [
  new Paragraph({ spacing: { before: 2800, after: 200 }, children: [new TextRun({ text: "KOI Integration", bold: true, size: 72, color: ORANGE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "for Cortex XSIAM", bold: true, size: 40, color: SLATE, font: "Calibri" })] }),
  hr,
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Customer User Guide", size: 32, color: GRAY, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 500 }, children: [
    new TextRun({ text: "Prepared for: ", size: 28, color: SLATE, font: "Calibri" }),
    new TextRun({ text: "[CUSTOMER NAME]", size: 28, bold: true, color: SLATE, font: "Calibri", highlight: "yellow" }),
  ] }),
  table([2600, 6760], [
    ["Document", "KOI Content Pack — Customer User Guide"],
    ["Customer", "[CUSTOMER NAME]"],
    ["Pack version", "1.5.0"],
    ["Guide revision", "1.4.0"],
    ["Applies to", "Cortex XSIAM — event collection, commands, playbooks and dashboard"],
    ["Last updated", "July 24, 2026"],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ---------------- TOC ---------------- */
const toc = [
  p("Table of Contents", { bold: true, size: 28 }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ---------------- 1. Introduction ---------------- */
const intro = [
  h1("1. Introduction"),
  h2("1.1 About KOI"),
  p("KOI is an endpoint security platform that provides visibility and control over the software your workforce actually runs: browser extensions, IDE plugins, code and OS packages, desktop applications, and the emerging agentic AI surface — MCP servers, AI models, skills, and AI-powered tools. KOI discovers these items across your endpoints, scores their risk, enforces allow/block policies, and generates alerts and audit events."),
  h2("1.2 What is in this content pack"),
  table([3000, 6360], [
    ["Component", "Purpose"],
    ["KOI integration", "Event collector (Alerts + Audit logs into Cortex XSIAM) plus 26 commands for inventory, devices, governance, allow/block lists, and the Koidex catalog."],
    ["Koi Parsing Rule", "Normalizes raw KOI events arriving in the koi_koi_raw dataset and promotes alert and audit fields for modeling."],
    ["Koi Modeling Rule", "Maps KOI alert and audit events to the Cortex Data Model (XDM)."],
    ["Koi Alerts Dashboard", "Ready-made XSIAM dashboard visualizing KOI alert activity."],
    ["Koi Unified Script Runner playbooks", "Five playbooks plus the KoiScanTracker automation that run KOI script packages on Cortex-Agent endpoints on a schedule, driven by two Jobs and configured through a JSON List, with per-endpoint scan-coverage tracking (section 10)."],
    ["Alert triage, investigation & response playbooks", "Seven playbooks that triage each KOI alert, run a full item and device investigation, compute a verdict, and drive analyst-gated response (section 11)."],
  ]),
  h2("1.3 Pack capabilities at a glance"),
  table([2600, 6760], [
    ["Capability", "What you get"],
    ["Telemetry collection", "KOI Alerts and Audit logs stream into the koi_koi_raw dataset, normalized by the parsing rule and mapped to the Cortex Data Model by the modeling rule — queryable in XQL and visualized by the bundled dashboard."],
    ["Asset & posture visibility", "Query the software your workforce actually runs — browser extensions, IDE plugins, npm/PyPI packages, desktop applications, MCP servers and other agentic-AI assets — per item or per device, with KOI's risk scoring."],
    ["Threat intelligence", "The Koidex catalog returns an independent risk score, findings, compliance data and an AI-generated risk summary for any item, whether or not it is installed in your organization."],
    ["Automated alert triage", "Every KOI alert is parsed, investigated and classified Benign / Suspicious / Malicious from KOI's own alert type and risk level plus the independent catalog risk. Benign alerts auto-close; the rest escalate for review."],
    ["Deep investigation", "Per item: catalog risk, AI summary, organization exposure (installs, publisher, signing, endpoint count), the endpoints and users affected, governance state, and remediation/approval history. Per device: everything installed on the affected host and which of it is risky."],
    ["Analyst-gated response", "A Malicious verdict opens a block approval showing the full investigation; the organization-wide blocklist write happens only after a human approves. Items already on the blocklist short-circuit."],
    ["Proactive hunting", "A scheduled MCP-server audit flags risky agentic-AI assets across the estate without waiting for an alert."],
    ["Fleet script execution", "Run KOI script packages (for example the deployment script) on Cortex-Agent endpoints on a schedule, configured entirely through a JSON List, with per-endpoint scan-coverage tracking so even endpoint groups larger than 100 are fully covered over successive runs."],
  ]),
  h2("1.4 What's new"),
  bullet([{ text: "Scan-coverage tracker (v1.4.0)", bold: true }, { text: " — the Script Runner is now tracker-driven: the new KoiScanTracker automation and a Refresh Job keep a per-endpoint ledger of when each endpoint was last scanned, so every endpoint is scanned once then re-scanned only after a configurable interval, and endpoint groups larger than 100 are fully covered over successive runs (section 10)." }]),
  bullet([{ text: "Alert triage, investigation and response playbooks", bold: true }, { text: " — automated triage with a full item and device investigation, a data-driven verdict, and an analyst-gated block (section 11)." }]),
  bullet([{ text: "13 read-only commands", bold: true }, { text: " covering devices, device inventory, findings, groups, users, remediations, approval requests, runtime (hardening) policies, Koidex catalog search and risk reports, and fetch-state diagnostics." }]),
  bullet([{ text: "First Fetch Time Range", bold: true }, { text: " parameter to control the initial event-collection lookback window." }]),
  bullet([{ text: "Tenant Name", bold: true }, { text: " parameter and automatic tenant identification: every collected event is stamped with koi_tenant_name and koi_customer_id, so events from multiple KOI tenants stay distinguishable." }]),
  bullet([{ text: "Parsing Rule, Modeling Rule, and the Koi Alerts Dashboard", bold: true }, { text: " (new XSIAM content)." }]),
];

/* ---------------- 2. Prerequisites ---------------- */
const prereq = [
  h1("2. Prerequisites"),
  bullet("An active KOI tenant, and a KOI account with the xt-Administrator role (required to create API keys)."),
  bullet("A Cortex XSIAM tenant — event collection, the parsing and modeling rules, the dashboard and the command surface all run there."),
  bullet([{ text: "Outbound HTTPS access from your Cortex tenant/engine to " }, { text: "https://api.prod.koi.security/", font: "Consolas", size: 20 }, { text: "." }]),
  bullet([{ text: "An egress IP that KOI accepts. ", bold: true }, { text: "KOI applies IP-based restrictions at its edge to the sensitive API endpoints (users, inventory, Koidex, governance). Requests leaving from shared datacenter or cloud egress ranges can be rejected with HTTP 403 even when the API key is valid and the same key succeeds from a corporate network. Event collection is unaffected. If your Cortex tenant egresses from a cloud range, run the KOI integration on a Cortex engine whose egress IP KOI accepts — see section 15." }]),
];

/* ---------------- 3. API key ---------------- */
const step_apikey = newStep();
const apikey = [
  h1("3. Create Your KOI API Key"),
  step_apikey([{ text: "Ensure the appropriate role. ", bold: true }, { text: "To create an API key you must hold the xt-Administrator role in KOI." }]),
  step_apikey([{ text: "Open Settings. ", bold: true }, { text: "Access the Settings page from the top navigation bar of the KOI console." }]),
  step_apikey([{ text: "Open the API Access tab. ", bold: true }, { text: "In Settings, select the API Access tab." }]),
  step_apikey([{ text: "Create the key. ", bold: true }, { text: "Click Create new API key." }]),
  step_apikey([{ text: "Copy the key. ", bold: true }, { text: "Within a few seconds the new key appears in the table. Click Copy next to it and store it securely — you will paste it into the integration instance." }]),
  p("Treat the API key like a password: store it in a secret manager and rotate it according to your organization's policy.", { italics: true, color: GRAY }),
];

/* ---------------- 4. Install ---------------- */
const step_install = newStep();
const install = [
  h1("4. Install the Pack"),
  p("This pack is delivered to you directly — as pack source or a pack zip — and is not distributed through the Cortex Marketplace. Install only from the artifact you were sent."),
  p("Do not install the KOI pack published in the Cortex Marketplace. That is a different build produced by someone else; its contents and version do not match this pack.", { bold: true }),
  step_install("Take the pack artifact you were sent (pack source, or a pack zip)."),
  step_install("Upload it to the tenant with demisto-sdk — the full procedure is in section 12."),
  step_install("Confirm the integration, parsing and modeling rules, dashboard and playbooks all appear on the tenant."),
  p("If you only need the scheduled Script Runner Jobs and nothing from the KOI API, you can skip the pack install entirely and import six items by hand — see section 13.2.", { italics: true, color: GRAY }),
];

/* ---------------- 5. Configure ---------------- */
const configure = [
  h1("5. Configure the Integration Instance"),
  p("In Cortex XSIAM, go to Settings → Configurations → Automation & Feed Integrations. Search for KOI and click Add instance."),
  h2("5.1 Connection parameters"),
  table([2700, 4460, 2200], [
    ["Parameter", "Description", "Default"],
    ["Server URL", "The KOI API server URL.", "https://api.prod.koi.security/"],
    ["API Key", "The key created in section 3.", "—"],
    ["Tenant Name", "Optional label stamped on every collected event as koi_tenant_name (e.g., \"Production\"). The tenant UUID (koi_customer_id) is captured automatically from the API key.", "—"],
    ["Trust any certificate", "Skip TLS verification (not recommended).", "Off"],
    ["Use system proxy settings", "Route via the system proxy.", "Off"],
  ]),
  h2("5.2 Event-collection parameters (Cortex XSIAM only)"),
  table([2700, 4460, 2200], [
    ["Parameter", "Description", "Default"],
    ["Fetch events", "Enables the event collector.", "Off"],
    ["Fetch event types", "Which KOI event streams to collect: Alerts, Audit.", "Alerts, Audit"],
    ["Audit log type filter", "Optionally restrict audit collection to selected types (approval_requests, devices, endpoints, extensions, firewall, guardrails, notifications, policies, remediation, requests, settings, vetting).", "All types"],
    ["First Fetch Time Range", "Lookback window for the first fetch only (e.g., \"3 days\", \"1 hour\"). Afterwards the collector always resumes from the last-fetched event timestamp.", "3 days"],
    ["Maximum number of events per fetch", "Cap per event type per fetch cycle.", "5000"],
    ["Events Fetch Interval", "How often the collector runs.", "1 minute"],
  ]),
  p("Multi-tenant tip: to collect from several KOI tenants, create one instance per tenant, each with its own API key and a distinct Tenant Name label — the koi_tenant_name field keeps the datasets cleanly separated.", { italics: true, color: GRAY }),
];

/* ---------------- 6. Verify ---------------- */
const step_verify = newStep();
const verify = [
  h1("6. Verify the Setup"),
  step_verify("Click Test on the instance. A successful test confirms URL and API key."),
  step_verify("From the CLI / War Room, run a read-only command:"),
  code("!koi-devices-list limit=5"),
  step_verify("Confirm a device table is returned. If you enabled event collection, allow one fetch interval and check the dataset (section 8)."),
];

/* ---------------- 7. Commands ---------------- */
const commands = [
  h1("7. Using the Commands"),
  p("Commands are grouped below by what they operate on. Commands marked with * modify tenant state; all others are read-only. Most list commands support page/page_size for a specific page, or limit to auto-paginate."),
  h2("7.1 Devices & organization"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-devices-list", "List devices registered with KOI (filter by status, last-seen, and more)."),
    cmdRow("koi-device-inventory-get", "List the items installed on a single device."),
    cmdRow("koi-groups-list", "List device groups."),
    cmdRow("koi-users-list", "List KOI users."),
  ]),
  h2("7.2 Inventory"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-inventory-list", "Paginated list of items installed across your endpoints, with rich filters (marketplace, platform, risk level, publisher, category)."),
    cmdRow("koi-inventory-item-get", "Full details for one item by ID + marketplace (+ optional version)."),
    cmdRow("koi-inventory-search", "Advanced query-builder search via filter JSON."),
    cmdRow("koi-inventory-item-endpoints-list", "Endpoints that have a specific item installed."),
  ]),
  h2("7.3 Governance & policies"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-policy-list", "List all policies."),
    cmdRow("koi-policy-status-update *", "Enable/disable a policy by ID."),
    cmdRow("koi-runtime-policies-list", "List agent runtime (hardening) enforcement policies."),
    cmdRow("koi-runtime-policy-get", "One runtime policy by ID, including its full rule tree."),
    cmdRow("koi-findings-list", "List finding (detection) definitions — resolve finding IDs returned elsewhere."),
    cmdRow("koi-approval-requests-list", "List approval requests."),
    cmdRow("koi-remediations-list", "List remediation suggestions."),
  ]),
  h2("7.4 Allowlist & blocklist"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-allowlist-get / koi-blocklist-get", "Retrieve the global allowlist / blocklist."),
    cmdRow("koi-allowlist-items-add * / koi-blocklist-items-add *", "Add one item (item_id + marketplace) or bulk-add from a JSON file entry."),
    cmdRow("koi-allowlist-items-remove * / koi-blocklist-items-remove *", "Remove one item or bulk-remove from a JSON file entry."),
  ]),
  h2("7.5 Threat intelligence — Koidex catalog"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-koidex-search", "Search KOI's catalog database by marketplace + search term."),
    cmdRow("koi-koidex-risk-report", "Risk + compliance report for a single catalog item."),
  ]),
  h2("7.6 Collector & diagnostics"),
  table([3400, 5960], [
    ["Command", "Description"],
    cmdRow("koi-get-events", "Manually pull events. Development/debugging only — keep should_push_events=false to avoid duplicates."),
    cmdRow("koi-fetch-context-get", "Read-only diagnostic: prints the collector's fetch state (last run / high-water mark)."),
    cmdRow("koi-fetch-context-set *", "Maintenance: adjust the fetch state to recover a stalled collector."),
  ]),
  h2("7.7 Worked examples"),
  p("List active devices:", { bold: true }),
  code("!koi-devices-list limit=50 status=active"),
  p("Everything installed on one device:", { bold: true }),
  code("!koi-device-inventory-get device_id=DEVICE-123 limit=50"),
  p("Find high-risk items across the fleet:", { bold: true }),
  code('!koi-inventory-search filter_json="{\\"field\\":\\"risk_level\\",\\"operator\\":\\"eq\\",\\"value\\":\\"high\\"}" limit=50'),
  p("Vet a package before approving it:", { bold: true }),
  code("!koi-koidex-search marketplace=npm search_term=axios"),
  code("!koi-koidex-risk-report item_id=axios marketplace=npm"),
  p("Block a malicious extension organization-wide:", { bold: true }),
  code('!koi-blocklist-items-add item_id=malicious-ext marketplace=chrome_web_store notes="Blocked due to security risk"'),
];

/* ---------------- 8. Event collection ---------------- */
const events = [
  h1("8. Event Collection into Cortex XSIAM"),
  p("With Fetch events enabled, the integration collects two streams from KOI on every fetch interval:"),
  bullet([{ text: "Alerts", bold: true }, { text: " — KOI security alerts (OCSF-shaped Application Security Posture Findings)." }]),
  bullet([{ text: "Audit", bold: true }, { text: " — administrative and item activity (installs, updates, policy changes, remediations…)." }]),
  p("Collection is incremental: the collector tracks the newest event timestamp per stream (a high-water mark) and resumes from it on every run, so events are neither missed nor duplicated. Events land in the koi_koi_raw dataset, where the pack's parsing rule normalizes them and the modeling rule maps them to XDM."),
  h2("8.1 Useful XQL starting points"),
  p("Recent KOI alerts:", { bold: true }),
  code('dataset = koi_koi_raw | filter source_log_type = "Alerts" | sort desc _time | limit 100'),
  p("Audit activity by type:", { bold: true }),
  code('dataset = koi_koi_raw | filter source_log_type = "Audit" | comp count() as events by type | sort desc events'),
  p("Volume per tenant and stream (multi-tenant deployments):", { bold: true }),
  code("dataset = koi_koi_raw | comp count() as events by koi_tenant_name, source_log_type"),
];

/* ---------------- 9. Dashboard ---------------- */
const dashboard = [
  h1("9. KOI Alerts Dashboard"),
  p("The pack ships the \"Koi Alerts Dashboard\", which visualizes KOI alert activity from the koi_koi_raw dataset. After installing the pack in XSIAM, open Dashboards & Reports, locate Koi Alerts Dashboard, and add it to your dashboards. Data appears once event collection has run (section 8)."),
];

/* ---------------- 10. Script Runner playbooks ---------------- */
const step_playbooks = newStep();
const playbooks = [
  h1("10. Koi Unified Script Runner Playbooks"),
  p("This set runs KOI script packages (for example, the KOI deployment script) on Cortex-Agent endpoints on a recurring schedule, configured entirely through a JSON List — retargeting or adding scripts never requires editing a playbook. Coverage is tracker-driven: a per-scope CSV List records when each endpoint was last scanned, so every endpoint is scanned once and then re-scanned only after a configurable interval, and an endpoint group larger than the 100-endpoint platform query cap is still covered fully across successive runs."),
  p("The system runs as two time-triggered Jobs sharing one configuration List. A Refresh Job (infrequent — e.g. hourly) keeps each scope's tracker List populated with its group's current membership; a Scan Job (frequent — e.g. every 10 minutes) dispatches the script to the endpoints that are due and connected, then marks them scanned. The KoiScanTracker automation owns the tracker List and all the due / connected / OS-safe / mark logic, so the playbooks stay thin."),
  h2("10.1 Architecture"),
  table([3400, 5960], [
    ["Playbook / Automation", "Role"],
    ["Koi Unified - Script Runner", "Scan Job entry point. Loads the \"Koi Script Runner\" List and loops over its entries — one iteration per entry, each in an isolated context. Closes its own investigation when done."],
    ["Koi Unified - Process Config Entry", "Per-entry logic: honors the disabled flag, validates the entry (invalid entries are reported in the war room, never silently dropped), invokes the executor, routes the outcome, sends the optional email notification, and cleans up."],
    ["Koi Unified - Execute Endpoint Script", "Asks KoiScanTracker for up to max endpoints that are due, currently connected, and of the entry's OS; runs the script on them with polling; marks them scanned (mark-on-dispatch); returns a structured ScriptResult."],
    ["Koi Unified - Refresh Tracker", "Refresh Job entry point. Loads the same \"Koi Script Runner\" List and loops over its entries to refresh each scope's tracker."],
    ["Koi Unified - Refresh Entry", "Per entry: walks the endpoint group (paged past 100 via the Core REST API) and append-only upserts membership into the scope's tracker List — never touching an existing last_scan."],
    ["KoiScanTracker (automation)", "Owns the tracker List I/O and the date/coverage logic. Action-dispatched: refresh (enumerate + upsert), select (return due, connected, right-OS ids), mark (stamp last_scan=now)."],
  ]),
  h2("10.2 What must already exist on the tenant (not shipped in the pack)"),
  p("The playbooks reference several objects strictly by name at runtime. None of these are delivered by the pack — they must be created on the tenant before the first run, with names that match the configuration exactly (case and spacing included):"),
  table([2700, 2660, 4000], [
    ["Dependency", "Where it lives", "Requirement"],
    ["Core REST API integration", "Automation & Feed Integrations", "Enabled. KoiScanTracker calls core-api-post through it to page an endpoint group past the 100-endpoint query cap during Refresh. Without it, Refresh cannot build the tracker and Scan has nothing to run."],
    ["KOI script package(s)", "Action Center → Scripts Library", "Upload the KOI deployment script(s) yourself — they are NOT part of this pack. The Library name must match the List's script.name exactly (e.g., \"KOI Deployment Script - Windows\"). The script must be parameterless — the run task passes no parameters_values. To make the reference rename-proof, pin script.uuid instead."],
    ["Endpoint group(s)", "Endpoints → Endpoint Groups", "Every group named in target.endpoint_groups must exist and contain the intended agents. Alternatively, scope by target.endpoint_hostnames."],
    ["Target agents", "Endpoints", "Cortex agents installed on the targets, CONNECTED and not isolated, with an OS matching the entry's endpoint_os — otherwise they are simply not selected this run and stay due."],
    ["Configuration List", "Settings → Object Setup → Lists", "A JSON List named exactly \"Koi Script Runner\" (section 10.3)."],
    ["Tracker List(s)", "Settings → Object Setup → Lists", "One CSV List per scope, named by each entry's target.tracker_list. Created automatically by the first Refresh run — no manual step."],
    ["Mail-sender instance (optional)", "Automation & Feed Integrations", "Required only when notifications are configured: an enabled instance that supports send-mail. If notification.sendmail_instance.name is set, an instance with that exact name must exist."],
  ]),
  p("Everything binds by name at run time: renaming a script in Action Center, an endpoint group, the List, or a mail instance — without updating the List configuration — causes the next run to fail or skip (the war-room reason states which reference broke).", { italics: true, color: GRAY }),
  h2("10.3 Configuration — the \"Koi Script Runner\" List"),
  p("Create a JSON List named exactly \"Koi Script Runner\" (Settings → Configurations → Object Setup → Lists) containing an array of entries:"),
  code('['),
  code('  {'),
  code('    "disabled": false,'),
  code('    "script": { "name": "KOI Deployment Script - Windows" },'),
  code('    "target": {'),
  code('      "endpoint_groups": ["KOI Endpoints"],'),
  code('      "endpoint_hostnames": [],'),
  code('      "endpoint_os": "Windows",'),
  code('      "tracker_list": "Koi Scan Tracker - Windows",'),
  code('      "rescan_interval_hours": 720'),
  code('    },'),
  code('    "notification": {'),
  code('      "sendmail_instance": { "name": "internal-smtp" },'),
  code('      "recipients": ["ops@example.com"]'),
  code('    }'),
  code('  }'),
  code(']'),
  table([3300, 1300, 4760], [
    ["Field", "Required", "Description"],
    ["disabled", "No", "Set true to skip the entry entirely."],
    ["script.name", "Yes*", "Exact script name in the Action Center Script Library. The script must be parameterless. (*Either name or uuid.)"],
    ["script.uuid", "No", "Script UUID — takes precedence over name and disambiguates duplicate names."],
    ["script.polling_interval_in_seconds", "No", "Poll cadence while the script runs (default 60)."],
    ["script.timeout_in_seconds", "No", "Overall execution timeout (default 1800)."],
    ["target.endpoint_os", "Yes", "Windows, macOS, or Linux (case-insensitive)."],
    ["target.endpoint_groups", "One of these", "Endpoint group names to scope execution."],
    ["target.endpoint_hostnames", "One of these", "Specific hostnames to scope execution."],
    ["target.tracker_list", "Yes", "Name of the CSV List this scope's scan coverage is tracked in (e.g. \"Koi Scan Tracker - Windows\"). Refresh creates it if missing."],
    ["target.rescan_interval_hours", "No", "Hours before a scanned endpoint becomes due again (default 720 = 30 days)."],
    ["target.max_endpoints", "No", "Endpoints dispatched to per Scan run (default 100, the platform maximum for the connected-check)."],
    ["notification.recipients", "No", "Email recipients for the per-entry outcome; omit for no email."],
    ["notification.sendmail_instance.name", "No", "Specific mail-sender instance; omit to use any enabled one."],
  ]),
  h2("10.4 How scripts are matched to endpoints"),
  p("The pairing of script to operating system is declared per entry and enforced when endpoints are selected: KoiScanTracker returns only endpoints that are due (never scanned, or last scanned longer ago than rescan_interval_hours), currently connected and unisolated, AND of the entry's endpoint_os. A Windows entry therefore can never execute on a Mac even if a wrong-OS row somehow lands in its tracker — and one shared group can serve every OS, with each scope's tracker holding only its own members."),
  h2("10.5 Job setup — two Jobs"),
  p("Create two time-triggered Jobs (Investigation & Response → Automation → Jobs → New Job). Schedule them at non-overlapping times; Refresh is append-only and Scan only updates existing rows, so an occasional overlap self-heals on the next cycle."),
  step_playbooks([{ text: "Refresh Job. ", bold: true }, { text: "Time-triggered, infrequent (e.g., hourly), playbook " }, { text: "Koi Unified - Refresh Tracker", bold: true }, { text: ". Run this at least once before the first Scan so the tracker is populated." }]),
  step_playbooks([{ text: "Scan Job. ", bold: true }, { text: "Time-triggered, frequent (e.g., every 10 minutes), playbook " }, { text: "Koi Unified - Script Runner", bold: true }, { text: ". Save, then use Run now for an immediate first run." }]),
  h2("10.6 Run outcomes"),
  table([2200, 3800, 3360], [
    ["Outcome", "Meaning", "Notification"],
    ["ok: true (+ action_id)", "Script dispatched to the due, connected endpoints; action_id links to Action Center. Marked scanned on dispatch — the run does not wait for Action Center to finish.", "Success email (when recipients configured)."],
    ["skipped: true", "Entry valid, but no due, connected endpoint currently matches the scope — nothing to do this run. Logged as an info entry.", "None — keeps recurring jobs quiet for scopes with nothing due."],
    ["timed_out: true", "The action was dispatched, but the playbook's poll expired before it finished. Not a failure — the endpoint is already marked scanned; a STILL RUNNING entry is logged.", "None."],
    ["ok: false + reason", "Real failure: script not found, ambiguous name, tracker/endpoint query error, or a dispatch failure. The reason states which.", "Failure email (when recipients configured)."],
  ]),
];

/* ---------------- 11. Triage / investigation / response playbooks ---------------- */
const step_triagePlaybooks = newStep();
const triagePlaybooks = [
  h1("11. Alert Triage, Investigation & Response Playbooks"),
  p("A second, independent playbook set turns each KOI alert into an investigated, classified and — when you approve it — actioned case. Attach KOI - Alert Triage to your KOI alerts and the rest runs automatically."),
  h2("11.1 The playbooks"),
  table([3100, 6260], [
    ["Playbook", "Role"],
    ["KOI - Alert Triage", "Main. Extracts the alert context, runs the item and device investigations, computes a verdict, posts a summary, and routes: auto-close benign, escalate the rest, and open an analyst-gated block for Malicious."],
    ["KOI - Extract Alert Context", "Sub. Parses the koi_context JSON embedded in the alert description into the KoiContext object."],
    ["KOI - Investigate Item", "Sub. Full investigation of the flagged item (11.3)."],
    ["KOI - Investigate Device", "Sub. Full investigation of the affected device (11.4)."],
    ["KOI - Enrich Item", "Sub. Lightweight enrichment (catalog risk plus endpoint exposure) for callers that do not need the full investigation."],
    ["KOI - Block and Remediate", "Investigates the item, skips it if already blocked, then adds it to the organization blocklist only after analyst approval."],
    ["KOI - MCP Server Audit", "Scheduled hunt. Flags MCP servers at or above a risk threshold; attach to a time-triggered Job."],
  ]),
  h2("11.2 Triage flow and verdicts"),
  p("The verdict is keyed on KOI's own alert type and risk level, with the independent Koidex catalog risk as a corroborating signal:"),
  table([1800, 4560, 3000], [
    ["Verdict", "Condition", "Action"],
    ["Malicious", "Alert type is Removed from Marketplace, Publisher Compromised or Unvetted MCP Server; or KOI risk level is High or Critical; or the catalog risk is high/critical.", "Raise severity, then open an analyst-gated block for the item."],
    ["Benign", "Alert type is New Item and KOI risk level is Low.", "Auto-close the alert as Resolved."],
    ["Suspicious", "Anything else (safe default).", "Leave open for analyst review."],
  ]),
  h2("11.3 What the item investigation gathers"),
  bullet("Catalog risk score and level, plus KOI's AI-generated risk summary."),
  bullet("Your organization's own inventory record for the item: installs count, endpoint count, publisher, signing status and organization risk level."),
  bullet("The endpoints the item is installed on and the users affected (resolved when the installed version is known)."),
  bullet("Governance state — whether the item already appears on the organization blocklist."),
  bullet("Remediation and approval history filtered to that item."),
  h2("11.4 What the device investigation gathers"),
  bullet("Every item installed on the affected device, with version, marketplace, publisher and install path."),
  bullet("Which of those items are at or above the configured risk level (default: high, critical), posted as a risky-items table."),
  bullet("Remediations recorded against that host."),
  h2("11.5 Response safety"),
  p("Adding an item to the blocklist is the only state-changing action in this set, and it is gated. KOI - Block and Remediate presents the full investigation to an analyst and writes only on approval; the triage always calls it with auto_block set to false, so a Malicious verdict can never block software without a human decision. Setting auto_block to true (only meaningful when you invoke the playbook directly) skips the gate — use with care."),
  h2("11.6 Attaching the triage"),
  step_triagePlaybooks("Ingest KOI alerts into Cortex (section 8) so each alert carries its koi_context payload."),
  step_triagePlaybooks([{ text: "Attach " }, { text: "KOI - Alert Triage", bold: true }, { text: " as the playbook for KOI alerts, or run it on an existing alert from the CLI:" }]),
  code('!setPlaybook playbookId="KOI - Alert Triage"'),
  step_triagePlaybooks("Confirm in the war room: an item investigation summary, a device investigation summary, and a triage summary carrying the verdict."),
  p("KOI - Investigate Item, KOI - Investigate Device and KOI - Block and Remediate declare required inputs, so they are designed to be called as sub-playbooks (or invoked by an analyst supplying those inputs) rather than attached directly to an alert.", { italics: true, color: GRAY }),
];

/* ---------------- 12. Deploy full pack via demisto-sdk ---------------- */
const step_sdkDeploy = newStep();
const sdkDeploy = [
  h1("12. Deploying the Full Pack as a Single Object (demisto-sdk)"),
  p("The pack can be delivered to a tenant as one artifact — a pack zip — using Palo Alto Networks' demisto-sdk. This is the path to use for every tenant, since the pack is delivered directly rather than through the Cortex Marketplace."),
  h2("12.1 Choosing an install path"),
  p("The path you choose determines whether event collection works at all. Commands and playbooks behave the same on every path; the collector and the rules do not."),
  table([2700, 3900, 1200, 2560], [
    ["Path", "What lands on the tenant", "Events flow?", "Use when"],
    ["demisto-sdk --xsiam", "Everything, at the version you were sent", "Yes", "The normal path"],
    ["Pre-built dist/Koi.zip", "Integration plus an old 3-playbook Script Runner only — no tracker, no rules, no dashboard", "No", "Not for XSIAM"],
    ["Manual per-item", "Only the items you import yourself", "Only if you add the rules", "Partial adoption"],
  ]),
  p("The pre-built dist/Koi.zip was built for a different marketplace target. Inside it the integration carries isfetchevents: false, and the artifact contains no parsing rules, no modeling rules and no dashboard. Uploading it to a Cortex XSIAM tenant produces an instance whose commands all work while the koi_koi_raw dataset stays permanently empty — which presents like a collector fault but is simply the wrong artifact. For working event collection, upload with demisto-sdk --xsiam.", { italics: true, color: GRAY }),
  h2("12.2 One-time setup"),
  step_sdkDeploy([{ text: "Install the SDK: ", bold: true }, { text: "pip3 install demisto-sdk", font: "Consolas", size: 20 }, { text: " (1.38+ required — older versions reject packs that declare the platform marketplace)." }]),
  step_sdkDeploy([{ text: "Place the pack in a content-repo structure. ", bold: true }, { text: "demisto-sdk only runs inside a repo shaped like demisto/content: a git repository containing Packs/Koi/<pack contents>, an empty .private-repo-settings file at the root, and Tests/secrets_white_list.json containing {\"iocs\":[],\"files\":[],\"generic_strings\":[]}." }]),
  step_sdkDeploy([{ text: "Set the connection environment variables: ", bold: true }, { text: "DEMISTO_BASE_URL", font: "Consolas", size: 20 }, { text: " (the api- URL of the tenant), " }, { text: "DEMISTO_API_KEY", font: "Consolas", size: 20 }, { text: ", and " }, { text: "XSIAM_AUTH_ID", font: "Consolas", size: 20 }, { text: " (the key's ID)." }]),
  h2("12.3 Build and push"),
  p("Validate, build the single pack artifact, and upload:"),
  code("demisto-sdk validate -i Packs/Koi/Playbooks"),
  code("demisto-sdk zip-packs -i Packs/Koi -o zipped"),
  code("demisto-sdk upload -i Packs/Koi -z --xsiam"),
  h2("12.4 Notes verified in practice"),
  bullet([{ text: "API key type matters. ", bold: true }, { text: "demisto-sdk sends the API key as-is, which works only with a Standard XSIAM API key. With an Advanced key the SDK cannot connect; in that case build the artifact with zip-packs and POST zipped/uploadable_packs/Koi.zip (multipart, field name \"file\") to https://api-<tenant>/xsoar/contentpacks/installed/upload?skipVerify=true&skipValidation=true using the advanced-key signed headers. Note the endpoint is under /xsoar/, not /xsoar/public/v1/." }]),
  bullet([{ text: "API modules. ", bold: true }, { text: "The Koi integration imports ContentClientApiModule; the build inlines it from Packs/ApiModules/Scripts/ContentClientApiModule/ — copy that folder from the demisto/content repository into your content repo before running zip-packs." }]),
  bullet([{ text: "Pack items become system-owned. ", bold: true }, { text: "After a pack install, its items (playbooks, integration) are marked system and reject individual item uploads. Ship subsequent changes as a new pack version (bump currentVersion in pack_metadata.json, add a release note, re-upload the zip)." }]),
  p("After upload, the pack appears in the tenant at the new version and every item (integration, playbooks, rules, dashboard) is installed together — see section 14 to validate."),
];

/* ---------------- 11. Manual onboarding ---------------- */
const manualOnboard = [
  h1("13. Onboarding Individual Items Manually"),
  p("If you prefer to adopt only part of the pack (or cannot use the SDK), each item can be onboarded by hand in the tenant UI. Import order matters where items reference each other by name."),
  h2("13.1 Item-by-item reference"),
  table([2900, 6460], [
    ["Item", "How to onboard manually"],
    ["Integration (Koi.yml)", "Settings → Configurations → Automation & Feed Integrations → Upload Integration, and select the YAML. Note this installs the integration only — the parsing and modeling rules and the dashboard are separate items below."],
    ["Automation — KoiScanTracker", "Investigation & Response → Automation → Scripts → Import. Import this before the Script Runner playbooks — they all call it by name."],
    ["Playbooks — Script Runner (5 files)", "Investigation & Response → Automation → Playbooks → Import. Import in dependency order (child before parent): 1) Koi Unified - Execute Endpoint Script, 2) Koi Unified - Process Config Entry, 3) Koi Unified - Refresh Entry, 4) Koi Unified - Refresh Tracker, 5) Koi Unified - Script Runner — references bind by name."],
    ["Playbooks — Triage & response (7 files)", "Same import screen. Import the sub-playbooks first (KOI - Extract Alert Context, KOI - Investigate Item, KOI - Investigate Device, KOI - Enrich Item), then KOI - Block and Remediate and KOI - MCP Server Audit, and finally KOI - Alert Triage. References bind by name."],
    ["Configuration List", "Settings → Configurations → Object Setup → Lists → New List. Name it exactly \"Koi Script Runner\", type JSON, and paste the configuration array (section 10.3)."],
    ["Jobs (two)", "Investigation & Response → Automation → Jobs → New Job, time-triggered: a Refresh Job on \"Koi Unified - Refresh Tracker\" (infrequent), and a Scan Job on \"Koi Unified - Script Runner\" (frequent). See section 10.5."],
    ["Parsing / Modeling Rules", "XSIAM: Settings → Data Management → Parsing Rules (and Modeling Rules) → add the content of the pack's .xif files as user-defined rules targeting dataset koi_koi_raw."],
    ["Koi Alerts Dashboard", "Dashboards & Reports → New Dashboard → Import, select Koi_Alerts_Dashboard.json."],
  ]),
  p("Keep item names unchanged when importing manually — the Job references the main playbook by name, the main playbook references the List by name, and the sub-playbooks reference each other by name.", { italics: true, color: GRAY }),
  h2("13.2 Running only the Script Runner Jobs"),
  p("A common case is wanting nothing from KOI's API — only the ability to run KOI script packages on Cortex-Agent endpoints on a schedule. That needs a small subset of the pack."),
  p("The Script Runner playbooks invoke no koi-* command at all. They use only the Cortex-native core-get-scripts, core-get-endpoints, core-script-run and core-api-post, plus the built-in send-mail for notifications. Consequently this deployment requires no KOI API key, no KOI integration instance, no parsing or modeling rules and no dashboard. The one integration it does need is the built-in Core REST API (for core-api-post, used by Refresh to page endpoint groups past 100)."),
  p("Import exactly these six content items, in this order (import the automation first, then each playbook before the one that calls it — references bind by name):"),
  table([700, 4100, 4560], [
    ["#", "Item", "Where"],
    ["1", "KoiScanTracker (automation)", "Investigation & Response → Automation → Scripts → Import"],
    ["2", "Koi Unified - Execute Endpoint Script", "Investigation & Response → Automation → Playbooks → Import"],
    ["3", "Koi Unified - Process Config Entry", "Investigation & Response → Automation → Playbooks → Import"],
    ["4", "Koi Unified - Refresh Entry", "Investigation & Response → Automation → Playbooks → Import"],
    ["5", "Koi Unified - Refresh Tracker", "Investigation & Response → Automation → Playbooks → Import"],
    ["6", "Koi Unified - Script Runner", "Investigation & Response → Automation → Playbooks → Import"],
  ]),
  p("Then create the JSON List \"Koi Script Runner\" (Settings → Configurations → Object Setup → Lists → New List, type JSON) and two time-triggered Jobs: a Refresh Job on \"Koi Unified - Refresh Tracker\" (infrequent) and a Scan Job on \"Koi Unified - Script Runner\" (frequent). The per-scope tracker Lists are created automatically by the first Refresh run."),
  p("Enable the built-in Core REST API integration, and make sure these already exist on the tenant, referenced by name from the List: the parameterless KOI script package in Action Center → Scripts Library (its Library name must equal script.name exactly, or pin script.uuid instead), an endpoint group named in target.endpoint_groups containing connected and unisolated agents whose OS matches target.endpoint_os, and — only if you configure notifications — an enabled mail-sender instance matching notification.sendmail_instance.name."),
  p("To validate this deployment on its own, run only test 9 of the test guide: Run now on the Refresh Job, then Run now on the Scan Job, and confirm the tracker List fills and ScriptResult ok:true with an action_id per scanned scope. Tests 1 to 8 all exercise the KOI API and do not apply.", { italics: true, color: GRAY }),
];

/* ---------------- 12. Validation ---------------- */
const validation = [
  h1("14. Validating That Everything Works"),
  p("Run these checks after any deployment, whether you uploaded the pack with the SDK or imported items by hand. Each row gives the action and the evidence that proves the component is healthy."),
  table([2500, 3600, 3260], [
    ["Component", "How to validate", "Expected evidence"],
    ["API connectivity", "Instance → Test button; then run !koi-devices-list limit=5 in the CLI.", "Test returns success; a device table renders."],
    ["Event collector", "Wait one fetch interval, then run the XQL query below (a).", "Recent rows with source_log_type Alerts/Audit; count grows between runs."],
    ["Parsing & modeling rules", "Inspect the XQL result fields.", "Fields like source_log_type, alert_type, severity, mcp_* are populated (not only _raw_log)."],
    ["Script Runner playbooks", "Jobs → select the job → Run now; open the run.", "Work Plan is all green; war room shows ScriptResult ok:true with an action_id per executed entry, and SKIPPED info entries for OS scopes with no endpoints."],
    ["Endpoint execution", "Action Center → All Actions → find the action_id.", "Status COMPLETED_SUCCESSFULLY on the expected endpoints."],
    ["Notifications", "Configure a mail-sender instance; re-run the job.", "Success/failure email arrives at the List's recipients; no send-mail errors in the war room."],
    ["Alert triage playbooks", "Run KOI - Alert Triage on a KOI alert (attach it, or !setPlaybook).", "War room shows an item investigation summary, a device investigation summary, and a triage summary carrying the verdict; benign alerts auto-close, others escalate."],
    ["Analyst-gated block", "Let a Malicious verdict reach the block step.", "The run parks at runStatus \"waiting\" on the approval task and koi-blocklist-items-add has NOT executed. It runs only after an analyst approves."],
    ["Dashboard", "Open Koi Alerts Dashboard.", "Widgets render data after the collector has ingested alerts."],
  ]),
  p("(a) Collector validation query:", { bold: true }),
  code('dataset = koi_koi_raw | sort desc _time | limit 10'),
  code('dataset = koi_koi_raw | comp count() as events by source_log_type'),
  p("Failure-path checks worth running once: temporarily set \"disabled\": true on a List entry (that entry must be skipped silently), and misspell a script name (the run must report a clear \"not found\" reason rather than hang).", { italics: true, color: GRAY }),
];

/* ---------------- 13. Troubleshooting ---------------- */
const troubleshooting = [
  h1("15. Troubleshooting"),
  table([2900, 3000, 3460], [
    ["Symptom", "Likely cause", "Resolution"],
    ["\"Authorization Error: Verify your API Key\"", "Key invalid, revoked, or pasted with whitespace", "Re-create the key (Settings → API Access, xt-Administrator role) and update the instance."],
    ["Test succeeds but no events arrive", "Fetch events disabled; wrong event types; or a stalled fetch state", "Enable Fetch events and check Fetch event types. Run koi-fetch-context-get to inspect the high-water mark; if it is stuck (e.g., in the future), recover with koi-fetch-context-set."],
    ["koi-inventory-search returns a 400 error", "filter_json is not a valid query-builder object", "Provide filter JSON in the documented structure (field/operator/value rules); see the command reference for examples."],
    ["Koidex commands return a 400 error", "Missing required arguments", "koi-koidex-search requires both marketplace and search_term; koi-koidex-risk-report requires item_id and marketplace."],
    ["Duplicate events after manual pulls", "koi-get-events was run with should_push_events=true", "Use koi-get-events for debugging only, and keep should_push_events=false."],
    ["HTTP 429 / rate limiting", "Fetch volume too aggressive", "Lower Maximum number of events per fetch or increase the fetch interval."],
    ["HTTP 403 on inventory, users, Koidex or governance commands, while event collection keeps working", "KOI's edge is rejecting the source IP — typically a shared datacenter or cloud egress range", "Run the integration on a Cortex engine whose egress IP KOI accepts (for example a corporate/office network), or ask KOI to allowlist your egress. Confirm with !koi-users-list limit=1 — the same key succeeds from an accepted IP and returns 403 from a rejected one."],
  ]),
];

/* ---------------- 11. Support ---------------- */
const support = [
  h1("16. Support & References"),
  bullet([{ text: "KOI product documentation: " }, { text: "https://docs.koi.ai", font: "Consolas", size: 20 }]),
  bullet("Pack release notes: see the ReleaseNotes folder inside the pack artifact you were sent."),
  bullet("For issues with the integration content, contact your Palo Alto Networks / KOI support channel."),
];

const doc = new Document({
  features: { updateFields: true },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }] },
      { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: SLATE } } },
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "KOI Integration — Customer User Guide  ·  Page ", size: 18, color: GRAY }),
            new TextRun({ size: 18, color: GRAY, children: [PageNumber.CURRENT] }),
            new TextRun({ text: " of ", size: 18, color: GRAY }),
            new TextRun({ size: 18, color: GRAY, children: [PageNumber.TOTAL_PAGES] }),
          ],
        })],
      }),
    },
    children: [
      ...cover, ...toc, ...intro, ...prereq, ...apikey, ...install,
      ...configure, ...verify, ...commands, ...events, ...dashboard,
      ...playbooks, ...triagePlaybooks, ...sdkDeploy, ...manualOnboard, ...validation,
      ...troubleshooting, ...support,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/KOI_Integration_Customer_Guide_v1.4.0.docx", buf);
  console.log("written", buf.length, "bytes");
});
