/* Build "KOI Integration for Cortex XSIAM & XSOAR — Customer User Guide" (.docx) */
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

const step = t =>
  new Paragraph({
    numbering: { reference: "steps", level: 0 },
    spacing: { after: 80 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(r => new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })),
  });

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
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "for Cortex XSIAM & Cortex XSOAR", bold: true, size: 40, color: SLATE, font: "Calibri" })] }),
  hr,
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Customer User Guide", size: 32, color: GRAY, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 500 }, children: [
    new TextRun({ text: "Prepared for: ", size: 28, color: SLATE, font: "Calibri" }),
    new TextRun({ text: "[CUSTOMER NAME]", size: 28, bold: true, color: SLATE, font: "Calibri", highlight: "yellow" }),
  ] }),
  table([2600, 6760], [
    ["Document", "KOI Content Pack — Customer User Guide"],
    ["Customer", "[CUSTOMER NAME]"],
    ["Pack version", "1.3.0"],
    ["Applies to", "Cortex XSIAM (event collection + commands) and Cortex XSOAR (commands)"],
    ["Last updated", "July 15, 2026"],
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
  ]),
  h2("1.3 What's new in pack 1.3.0"),
  bullet([{ text: "13 new read-only commands", bold: true }, { text: " covering devices, device inventory, findings, groups, users, remediations, approval requests, runtime (hardening) policies, Koidex catalog search and risk reports, and fetch-state diagnostics." }]),
  bullet([{ text: "First Fetch Time Range", bold: true }, { text: " parameter to control the initial event-collection lookback window." }]),
  bullet([{ text: "Tenant Name", bold: true }, { text: " parameter and automatic tenant identification: every collected event is stamped with koi_tenant_name and koi_customer_id, so events from multiple KOI tenants stay distinguishable." }]),
  bullet([{ text: "Parsing Rule, Modeling Rule, and the Koi Alerts Dashboard", bold: true }, { text: " (new XSIAM content)." }]),
];

/* ---------------- 2. Prerequisites ---------------- */
const prereq = [
  h1("2. Prerequisites"),
  bullet("An active KOI tenant, and a KOI account with the xt-Administrator role (required to create API keys)."),
  bullet("Cortex XSIAM for event collection, modeling rules, and the dashboard. The commands also work from Cortex XSOAR."),
  bullet([{ text: "Outbound HTTPS access from your Cortex tenant/engine to " }, { text: "https://api.prod.koi.security/", font: "Consolas", size: 20 }, { text: "." }]),
];

/* ---------------- 3. API key ---------------- */
const apikey = [
  h1("3. Create Your KOI API Key"),
  step([{ text: "Ensure the appropriate role. ", bold: true }, { text: "To create an API key you must hold the xt-Administrator role in KOI." }]),
  step([{ text: "Open Settings. ", bold: true }, { text: "Access the Settings page from the top navigation bar of the KOI console." }]),
  step([{ text: "Open the API Access tab. ", bold: true }, { text: "In Settings, select the API Access tab." }]),
  step([{ text: "Create the key. ", bold: true }, { text: "Click Create new API key." }]),
  step([{ text: "Copy the key. ", bold: true }, { text: "Within a few seconds the new key appears in the table. Click Copy next to it and store it securely — you will paste it into the integration instance." }]),
  p("Treat the API key like a password: store it in a secret manager and rotate it according to your organization's policy.", { italics: true, color: GRAY }),
];

/* ---------------- 4. Install ---------------- */
const install = [
  h1("4. Install the Pack"),
  step("In Cortex XSIAM/XSOAR, open Marketplace."),
  step([{ text: "Search for " }, { text: "KOI", bold: true }, { text: " and open the pack." }]),
  step("Click Install. The integration, parsing/modeling rules, and the dashboard are installed together."),
];

/* ---------------- 5. Configure ---------------- */
const configure = [
  h1("5. Configure the Integration Instance"),
  p("In Cortex XSIAM, go to Settings → Configurations → Automation & Feed Integrations; in Cortex XSOAR, go to Settings → Integrations → Instances. Search for KOI and click Add instance."),
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
const verify = [
  h1("6. Verify the Setup"),
  step("Click Test on the instance. A successful test confirms URL and API key."),
  step("From the CLI / War Room, run a read-only command:"),
  code("!koi-devices-list limit=5"),
  step("Confirm a device table is returned. If you enabled event collection, allow one fetch interval and check the dataset (section 8)."),
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

/* ---------------- 10. Deploy full pack via demisto-sdk ---------------- */
const sdkDeploy = [
  h1("10. Deploying the Full Pack as a Single Object (demisto-sdk)"),
  p("The pack can be delivered to a tenant as one artifact — a pack zip — using Palo Alto Networks' demisto-sdk. This is the recommended path for dev/test tenants and CI pipelines; production tenants normally install from the Marketplace."),
  h2("10.1 One-time setup"),
  step([{ text: "Install the SDK: ", bold: true }, { text: "pip3 install demisto-sdk", font: "Consolas", size: 20 }, { text: " (1.38+ required — older versions reject packs that declare the platform marketplace)." }]),
  step([{ text: "Place the pack in a content-repo structure. ", bold: true }, { text: "demisto-sdk only runs inside a repo shaped like demisto/content: a git repository containing Packs/Koi/<pack contents>, an empty .private-repo-settings file at the root, and Tests/secrets_white_list.json containing {\"iocs\":[],\"files\":[],\"generic_strings\":[]}." }]),
  step([{ text: "Set the connection environment variables: ", bold: true }, { text: "DEMISTO_BASE_URL", font: "Consolas", size: 20 }, { text: " (the api- URL of the tenant), " }, { text: "DEMISTO_API_KEY", font: "Consolas", size: 20 }, { text: ", and " }, { text: "XSIAM_AUTH_ID", font: "Consolas", size: 20 }, { text: " (the key's ID)." }]),
  h2("10.2 Build and push"),
  p("Validate, build the single pack artifact, and upload:"),
  code("demisto-sdk validate -i Packs/Koi/Playbooks"),
  code("demisto-sdk zip-packs -i Packs/Koi -o zipped"),
  code("demisto-sdk upload -i Packs/Koi -z --xsiam"),
  h2("10.3 Notes verified in practice"),
  bullet([{ text: "API key type matters. ", bold: true }, { text: "demisto-sdk sends the API key as-is, which works only with a Standard XSIAM API key. With an Advanced key the SDK cannot connect; in that case build the artifact with zip-packs and POST zipped/uploadable_packs/Koi.zip (multipart, field name \"file\") to https://api-<tenant>/xsoar/contentpacks/installed/upload?skipVerify=true&skipValidation=true using the advanced-key signed headers. Note the endpoint is under /xsoar/, not /xsoar/public/v1/." }]),
  bullet([{ text: "API modules. ", bold: true }, { text: "The Koi integration imports ContentClientApiModule; the build inlines it from Packs/ApiModules/Scripts/ContentClientApiModule/ — copy that folder from the demisto/content repository into your content repo before running zip-packs." }]),
  bullet([{ text: "Pack items become system-owned. ", bold: true }, { text: "After a pack install, its items (playbooks, integration) are marked system and reject individual item uploads. Ship subsequent changes as a new pack version (bump currentVersion in pack_metadata.json, add a release note, re-upload the zip)." }]),
  p("After upload, the pack appears in the tenant at the new version and every item (integration, playbooks, rules, dashboard) is installed together — see section 12 to validate."),
];

/* ---------------- 11. Manual onboarding ---------------- */
const manualOnboard = [
  h1("11. Onboarding Individual Items Manually"),
  p("If you prefer to adopt only part of the pack (or cannot use the SDK), each item can be onboarded by hand in the tenant UI. Import order matters where items reference each other by name."),
  table([2900, 6460], [
    ["Item", "How to onboard manually"],
    ["Integration (Koi.yml)", "Marketplace → install the KOI pack (recommended); or Settings → Configurations → Automation & Feed Integrations → Upload Integration and select the YAML."],
    ["Playbooks (3 files)", "Investigation & Response → Automation → Playbooks → Import. Import in dependency order: 1) Koi Unified - Execute Endpoint Script, 2) Koi Unified - Process Config Entry, 3) Koi Unified - Script Runner — sub-playbook references bind by name."],
    ["Configuration List", "Settings → Configurations → Object Setup → Lists → New List. Name it exactly \"Koi Script Runner\", type JSON, and paste the configuration array (section 7 of the playbook README)."],
    ["Job", "Investigation & Response → Automation → Jobs → New Job. Time-triggered, choose the \"Koi Unified - Script Runner\" playbook, set the recurrence."],
    ["Parsing / Modeling Rules", "XSIAM: Settings → Data Management → Parsing Rules (and Modeling Rules) → add the content of the pack's .xif files as user-defined rules targeting dataset koi_koi_raw."],
    ["Koi Alerts Dashboard", "Dashboards & Reports → New Dashboard → Import, select Koi_Alerts_Dashboard.json."],
  ]),
  p("Keep item names unchanged when importing manually — the Job references the main playbook by name, the main playbook references the List by name, and the sub-playbooks reference each other by name.", { italics: true, color: GRAY }),
];

/* ---------------- 12. Validation ---------------- */
const validation = [
  h1("12. Validating That Everything Works"),
  p("Run these checks after any deployment (SDK, Marketplace, or manual). Each row gives the action and the evidence that proves the component is healthy."),
  table([2500, 3600, 3260], [
    ["Component", "How to validate", "Expected evidence"],
    ["API connectivity", "Instance → Test button; then run !koi-devices-list limit=5 in the CLI.", "Test returns success; a device table renders."],
    ["Event collector", "Wait one fetch interval, then run the XQL query below (a).", "Recent rows with source_log_type Alerts/Audit; count grows between runs."],
    ["Parsing & modeling rules", "Inspect the XQL result fields.", "Fields like source_log_type, alert_type, severity, mcp_* are populated (not only _raw_log)."],
    ["Script Runner playbooks", "Jobs → select the job → Run now; open the run.", "Work Plan is all green; war room shows ScriptResult ok:true with an action_id per executed entry, and SKIPPED info entries for OS scopes with no endpoints."],
    ["Endpoint execution", "Action Center → All Actions → find the action_id.", "Status COMPLETED_SUCCESSFULLY on the expected endpoints."],
    ["Notifications", "Configure a mail-sender instance; re-run the job.", "Success/failure email arrives at the List's recipients; no send-mail errors in the war room."],
    ["Dashboard", "Open Koi Alerts Dashboard.", "Widgets render data after the collector has ingested alerts."],
  ]),
  p("(a) Collector validation query:", { bold: true }),
  code('dataset = koi_koi_raw | sort desc _time | limit 10'),
  code('dataset = koi_koi_raw | comp count() as events by source_log_type'),
  p("Failure-path checks worth running once: temporarily set \"disabled\": true on a List entry (that entry must be skipped silently), and misspell a script name (the run must report a clear \"not found\" reason rather than hang).", { italics: true, color: GRAY }),
];

/* ---------------- 13. Troubleshooting ---------------- */
const troubleshooting = [
  h1("13. Troubleshooting"),
  table([2900, 3000, 3460], [
    ["Symptom", "Likely cause", "Resolution"],
    ["\"Authorization Error: Verify your API Key\"", "Key invalid, revoked, or pasted with whitespace", "Re-create the key (Settings → API Access, xt-Administrator role) and update the instance."],
    ["Test succeeds but no events arrive", "Fetch events disabled; wrong event types; or a stalled fetch state", "Enable Fetch events and check Fetch event types. Run koi-fetch-context-get to inspect the high-water mark; if it is stuck (e.g., in the future), recover with koi-fetch-context-set."],
    ["koi-inventory-search returns a 400 error", "filter_json is not a valid query-builder object", "Provide filter JSON in the documented structure (field/operator/value rules); see the command reference for examples."],
    ["Koidex commands return a 400 error", "Missing required arguments", "koi-koidex-search requires both marketplace and search_term; koi-koidex-risk-report requires item_id and marketplace."],
    ["Duplicate events after manual pulls", "koi-get-events was run with should_push_events=true", "Use koi-get-events for debugging only, and keep should_push_events=false."],
    ["HTTP 429 / rate limiting", "Fetch volume too aggressive", "Lower Maximum number of events per fetch or increase the fetch interval."],
  ]),
];

/* ---------------- 11. Support ---------------- */
const support = [
  h1("14. Support & References"),
  bullet([{ text: "KOI product documentation: " }, { text: "https://docs.koi.ai", font: "Consolas", size: 20 }]),
  bullet("Pack release notes: see the KOI pack page in the Cortex Marketplace."),
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
      ...sdkDeploy, ...manualOnboard, ...validation,
      ...troubleshooting, ...support,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/KOI_Integration_Customer_Guide_v1.3.0.docx", buf);
  console.log("written", buf.length, "bytes");
});
