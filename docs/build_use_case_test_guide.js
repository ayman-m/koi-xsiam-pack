const {
  BorderStyle, Document, Footer, HeadingLevel, LevelFormat,
  PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableOfContents, TableRow, TextRun, VerticalAlign, WidthType, AlignmentType,
} = require("docx");
const fs = require("fs");

const ORANGE = "E8551F";
const SLATE = "1F2937";
const GRAY = "6B7280";
const LIGHT = "F3F4F6";
const RED = "B42318";
const GREEN = "1F7A3D";
const HEADER_BG = "334155";

const p = (text, o = {}) =>
  new Paragraph({
    spacing: { after: 120, ...(o.spacing || {}) },
    children: [new TextRun({ text, size: o.size || 22, bold: o.bold, italics: o.italics,
      color: o.color || SLATE, font: "Calibri" })],
  });

const rich = (runs, o = {}) =>
  new Paragraph({
    spacing: { after: 120, ...(o.spacing || {}) },
    children: runs.map(r => new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })),
  });

const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 },
  children: [new TextRun({ text: t, bold: true, size: 32, color: ORANGE, font: "Calibri" })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 },
  children: [new TextRun({ text: t, bold: true, size: 26, color: SLATE, font: "Calibri" })] });

const bullet = (t, o = {}) => new Paragraph({
  numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 },
  children: (Array.isArray(t) ? t : [{ text: t }]).map(r =>
    new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })), ...o });

let __inst = 0;
const newStep = () => { const instance = ++__inst;
  return t => new Paragraph({ numbering: { reference: "steps", level: 0, instance }, spacing: { after: 80 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(r =>
      new TextRun({ size: 22, color: SLATE, font: "Calibri", ...r })) }); };

const code = t => new Paragraph({
  spacing: { after: 60 }, shading: { type: ShadingType.CLEAR, fill: LIGHT },
  indent: { left: 200, right: 200 },
  children: [new TextRun({ text: t, font: "Consolas", size: 18, color: "111827" })] });

const cell = (t, { w, header = false, mono = false, color } = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
  shading: header ? { type: ShadingType.CLEAR, fill: HEADER_BG } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({
    text: t, size: header ? 20 : 19, bold: header,
    color: header ? "FFFFFF" : (color || SLATE), font: mono ? "Consolas" : "Calibri" })] })] });

const table = (widths, rows, opts = {}) => new Table({
  columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, cantSplit: true,
    children: r.map((t, j) => cell(t, { w: widths[j], header: i === 0,
      mono: i > 0 && (opts.mono || []).includes(j),
      color: i > 0 && r.__color ? r.__color : undefined })) })) });

const hr = new Paragraph({ spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } }, children: [] });

/* ---------------- Cover ---------------- */

/* ============================================================================
   KOI Content Pack — Test Guide by Use Case
   Run:  NODE_PATH=<dir with docx> node build_use_case_test_guide.js
   ============================================================================ */

const OK = GREEN;

/* ---------------- Cover ---------------- */
const cover = [
  new Paragraph({ spacing: { before: 2600, after: 200 }, children: [
    new TextRun({ text: "KOI Content Pack", size: 56, bold: true, color: ORANGE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 120 }, children: [
    new TextRun({ text: "Test Guide by Use Case", size: 40, bold: true, color: SLATE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 600 }, children: [
    new TextRun({ text: "Seven use cases — what to do, what to expect, and why it matters",
      size: 24, italics: true, color: GRAY, font: "Calibri" })] }),
  table([2600, 6760], [
    ["Document", "KOI Content Pack — Test Guide by Use Case"],
    ["Pack version", "1.5.0"],
    ["Guide revision", "1.0"],
    ["Applies to", "Cortex XSIAM"],
    ["Last updated", "July 25, 2026"],
  ]),
  new Paragraph({ spacing: { before: 300 }, children: [] }),
  p("Work top to bottom the first time — later use cases assume earlier ones passed.",
    { italics: true, color: GRAY }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  p("Contents", { bold: true, size: 28 }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ---------------- Before you start ---------------- */
const before = [
  h1("Before You Start"),
  table([3000, 6360], [
    ["Need", "Why it matters"],
    ["Pack installed with demisto-sdk … --xsiam", "A zip upload lands the content but not working event collection."],
    ["KOI integration instance, test green", "Everything except the Script Runner reads the KOI API."],
    ["An egress IP KOI accepts, or a Cortex engine that has one", "KOI restricts its sensitive endpoints by source IP. A wrong egress returns HTTP 403 even with a valid key."],
    ["Core REST API integration enabled", "KoiScanTracker pages endpoint groups past the 100-endpoint cap through it."],
  ]),
  p("Check the engine before anything else. If the instance runs on a Cortex engine and that engine is disconnected, every koi-* command fails with \"Engine … is not connected\" before it ever reaches KOI. That reads like an integration fault and is not one.",
    { bold: true, spacing: { before: 200 } }),
  h2("Generating test data on demand"),
  p("You do not have to wait for real KOI activity. The KoiSimulateEvents automation (TestTools/KoiSimulateEvents) generates events shaped exactly like real ones and reports the answers in advance, so you check arithmetic rather than impressions."),
  code("!KoiSimulateEvents alerts=40 duplicate_factor=8 audit=60"),
  p("It writes to koisim_koisim_raw, never koi_koi_raw, so it cannot corrupt real data or a second project's measurements. Query that dataset, or substitute its name into any query you are testing.",
    { italics: true, color: GRAY, spacing: { before: 140 } }),
];

/* ---------------- 1. Event collection ---------------- */
const s1 = newStep();
const uc1 = [
  h1("1. Event Collection"),
  p("Why: everything downstream reads koi_koi_raw. If collection is wrong, every later result is wrong in a way that looks like a content bug.", { bold: true }),
  h2("Do"),
  s1("Enable Fetch events on the instance and wait two cycles."),
  s1("Run:"),
  code('dataset = koi_koi_raw | comp count() as rows by source_log_type'),
  h2("Expect"),
  bullet("Rows under both Alerts and Audit."),
  h2("Then check the counts mean what they say"),
  code('dataset = koi_koi_raw | filter source_log_type = "Alerts"'),
  code('| alter nid = json_extract_scalar(metadata, "$.notification_event_id")'),
  code('| comp count() as rows, count_distinct(nid) as real_alerts'),
  p("rows will be far larger than real_alerts. That gap is normal — KOI re-sends every still-open alert on each fetch. notification_event_id is the only per-alert identity; koi_event_id is the scan batch and finding_uid is the policy definition. Anything counting alerts must use count_distinct on the notification id.",
    { spacing: { before: 200 } }),
  table([3000, 6360], [
    ["If you see", "It means"],
    ["No Audit rows", "The Audit types parameter is narrowed. Leave it empty for all types."],
    ["rows equals real_alerts", "Only one fetch has run, or every alert closed immediately. Not an error."],
  ]),
];

/* ---------------- 2. Alert triage ---------------- */
const s2 = newStep();
const uc2 = [
  h1("2. Alert Triage"),
  p("Why: this is the pack's main automation. It must reach a verdict from KOI's real vocabulary, and must not re-investigate the same alert over and over.", { bold: true }),
  h2("Do"),
  s2("Attach KOI - Alert Triage to a KOI alert, or run it on an existing one:"),
  code('!setPlaybook playbookId="KOI - Alert Triage"'),
  s2("Open the war room."),
  h2("Expect"),
  bullet("A KoiContext object carrying item id, marketplace, risk level and hostname."),
  bullet("An investigation summary, then a verdict: Malicious, Suspicious or Benign."),
  bullet("Low-risk items auto-close. Critical and high escalate. Medium and pending stay open for an analyst."),
  p("Why those three: the verdict keys on risk_level, which KOI sends in lowercase (critical / high / medium / low / pending), plus the independent catalog risk. A pending item is one KOI has not finished assessing, so it deliberately does not auto-close.",
    { spacing: { before: 200 } }),
  h2("Then test the dedupe"),
  p("Run triage twice against alerts sharing one notification id."),
  rich([{ text: "Expect ", bold: true },
        { text: "the second run to stop early with a DUPLICATE entry naming the alert that already handled it." }]),
  table([3000, 6360], [
    ["If you see", "It means"],
    ["KoiContext empty, everything Suspicious", "The alert carried no OCSF payload and no koi_context blob. Check the correlation rule passes the KOI fields through. This is the most common cause."],
    ["No DUPLICATE on a repeat", "The notification id was empty. The gate is built to fall through to normal triage rather than swallow an alert."],
  ]),
];

/* ---------------- 3. Investigation ---------------- */
const s3 = newStep();
const uc3 = [
  h1("3. Investigation Depth"),
  p("Why: a verdict is only as good as what sits behind it, and an analyst approving a block needs the whole picture.", { bold: true }),
  h2("Do"),
  s3("Run KOI - Investigate Item with an item_id and marketplace."),
  s3("Run KOI - Investigate Device with a device id."),
  h2("Expect"),
  bullet("A KoiInvestigation summary with catalog risk and the AI summary."),
  bullet("Organisation exposure: installs, endpoints affected, users."),
  bullet([{ text: "Both governance counts — blocklisted_count ", bold: true },
          { text: "and", bold: true }, { text: " allowlisted_count.", bold: true }]),
  bullet("For the device: everything installed on that host, plus a risky-items table."),
  p("Why both counts matter: zero blocklist hits alone does not mean \"not governed\". It can mean somebody explicitly allowed the item. Without the allowlist read, an allowlisted item stays a valid block candidate.",
    { spacing: { before: 200 } }),
  p("Enrichment is best-effort by design. If it comes back empty while the playbook stays green, confirm reachability with !koi-users-list limit=1 before assuming a content fault.",
    { italics: true, color: GRAY, spacing: { before: 160 } }),
];

/* ---------------- 4. Gated response ---------------- */
const s4 = newStep();
const uc4 = [
  h1("4. Gated Response"),
  p("Why: this is the only state-changing action in the pack. It must never fire without a human.", { bold: true }),
  h2("Do"),
  s4("Run KOI - Block and Remediate with an item_id and marketplace."),
  h2("Expect"),
  bullet("The run parks on an approval task."),
  bullet("The approval shows catalog and org risk, exposure, remediation history, and the governance line — including a warning when the item is already allowlisted."),
  bullet("Nothing reaches the blocklist until somebody approves."),
  bullet("An item already on the blocklist short-circuits instead of being added twice."),
  p("This is the gate to re-run after any change to the response playbook. If it ever completes without parking, stop and investigate before using the pack in production.",
    { bold: true, color: RED, spacing: { before: 200 } }),
];

/* ---------------- 5. Hunting ---------------- */
const s5 = newStep();
const uc5 = [
  h1("5. Proactive Hunting"),
  p("Why: finds risk that nobody alerted on.", { bold: true }),
  h2("Do"),
  s5("Run KOI - MCP Server Audit, directly or from a Job."),
  s5("Run a few library hunts from docs/xql — start with H2.1 and H1.3."),
  h2("Expect"),
  bullet("The audit lists MCP servers at or above the risk threshold."),
  bullet("The hunts return findings KOI scored but nobody actioned."),
  table([3000, 6360], [
    ["Worth knowing", "Detail"],
    ["view=mcp_servers", "Now selectable in the argument dropdown. It previously worked only when a playbook passed it literally."],
    ["view=all_items", "Accepted by the API but returns nothing. Omit view entirely to query everything."],
    ["The library", "26 hunts and 46 detections in docs/xql. Read QUERY_LIBRARY.md first. They read raw dataset columns, so they do not depend on the modeling rule."],
  ]),
];

/* ---------------- 6. Script Runner ---------------- */
const s6 = newStep();
const uc6 = [
  h1("6. Fleet Script Execution"),
  p("Why: runs KOI deployment scripts across endpoints on a schedule, and must cover groups larger than the platform's 100-endpoint query cap.", { bold: true }),
  h2("Do"),
  s6("Create the JSON List Koi Script Runner, with tracker_list and rescan_interval_hours set per entry."),
  s6([{ text: "Run the Refresh job (Koi Unified - Refresh Tracker) " }, { text: "first", bold: true }, { text: "." }]),
  s6("Then run the Scan job (Koi Unified - Script Runner)."),
  h2("Expect"),
  bullet("Refresh fills the tracker List with endpoint_id,last_scan rows — it creates the List for you."),
  bullet("Scan dispatches to due, connected endpoints and stamps their last_scan."),
  bullet("Offline, wrong-OS and not-in-inventory endpoints stay due and retry on the next run."),
  bullet("A second Scan straight afterwards does nothing — everything is inside the rescan interval."),
  p("Why Refresh first: Scan reads the tracker. An empty tracker means nothing is due, and that run is a legitimate no-op that can easily look like a failure.",
    { spacing: { before: 200 } }),
  h2("Outcomes that are not failures"),
  table([2600, 6760], [
    ["Entry", "What it means"],
    ["SKIPPED", "Nothing due and connected right now. Sends no email, by design."],
    ["STILL RUNNING", "Dispatched, but polling ended before Action Center finished. The endpoints are already marked and the action completes on its own. Sends no email."],
  ]),
  p("If neither job ever runs, confirm each Job is enabled and shows a next-run time. A newly created Job can land disabled.",
    { bold: true, spacing: { before: 200 } }),
];

/* ---------------- 7. Dashboard ---------------- */
const uc7 = [
  h1("7. Dashboard"),
  p("Why: these numbers get quoted to other people.", { bold: true }),
  h2("Do"),
  p("Open the KOI Alerts Dashboard."),
  h2("Expect"),
  bullet("Alert counts far lower than raw row counts."),
  bullet("Counts that stay stable as fetch cycles repeat."),
  p("Every Alerts widget dedupes on the notification id before counting, so it reports alerts rather than re-deliveries. If a widget's number climbs steadily while nothing new is happening in KOI, that widget is counting fetches.",
    { spacing: { before: 200 } }),
];

/* ---------------- Sign-off ---------------- */
const signoff = [
  h1("Sign-off"),
  p("One line of evidence per use case."),
  table([700, 3100, 5560], [
    ["#", "Use case", "Evidence"],
    ["1", "Event collection", "Both Alerts and Audit present; count_distinct(nid) well below raw rows"],
    ["2", "Alert triage", "Verdict reached; low risk auto-closes; a repeat notification stops as DUPLICATE"],
    ["3", "Investigation depth", "Investigation carries catalog risk and both governance counts"],
    ["4", "Gated response", "Run parks on approval; blocklist untouched until approved"],
    ["5", "Proactive hunting", "MCP audit returns servers at or above threshold; hunts run"],
    ["6", "Fleet script execution", "Refresh fills the tracker; Scan marks only due and connected; re-run is a no-op"],
    ["7", "Dashboard", "Alert counts stable across fetch cycles"],
  ]),
  p("All seven green means the pack is ready for production use.", { bold: true, color: OK, spacing: { before: 200 } }),
  hr,
  p("Full detail is in the customer guide (KOI_Integration_Customer_Guide_v1.4.0). Deeper diagnostics are in the troubleshooting guide.",
    { italics: true, color: GRAY }),
];

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
  ] },
  styles: { paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 32, bold: true, color: ORANGE, font: "Calibri" } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 26, bold: true, color: SLATE, font: "Calibri" } },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "KOI — Test Guide by Use Case   ·   ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ text: " / ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: "Calibri" })] })] }) },
    children: [...cover, ...toc, ...before, ...uc1, ...uc2, ...uc3, ...uc4, ...uc5, ...uc6, ...uc7, ...signoff],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = __dirname + "/KOI_Test_Guide_By_Use_Case_v1.0.docx";
  fs.writeFileSync(out, buf);
  console.log("written " + buf.length + " bytes -> " + out);
});
