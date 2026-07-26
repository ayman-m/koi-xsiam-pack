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
   KOI on Cortex XSIAM — Choosing Your Deployment
   Custom integration + custom content  vs  Marketplace integration + extension
   Run:  NODE_PATH=<dir with docx> node build_comparison.js
   ============================================================================ */
const OK = GREEN;
const A = "Custom";
const B = "Marketplace";

const cover = [
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [
    new TextRun({ text: "KOI on Cortex XSIAM", size: 56, bold: true, color: ORANGE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 120 }, children: [
    new TextRun({ text: "Choosing Your Deployment", size: 40, bold: true, color: SLATE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 600 }, children: [
    new TextRun({ text: "Two supported options, compared — so you can pick on evidence rather than assertion",
      size: 24, italics: true, color: GRAY, font: "Calibri" })] }),
  table([2600, 6760], [
    ["Option A", "Custom KOI integration + Custom content pack (26 commands)"],
    ["Option B", "Marketplace KOI integration + KOI Content Extension (13 commands)"],
    ["Applies to", "Cortex XSIAM"],
    ["Last updated", "July 26, 2026"],
  ]),
  new Paragraph({ spacing: { before: 300 }, children: [] }),
  p("Both options are real, working deployments. This document sets out what each gives you, what it does not, and which questions should decide it.",
    { italics: true, color: GRAY }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  p("Contents", { bold: true, size: 28 }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ---------------- 1. The decision ---------------- */
const decision = [
  h1("1. The Decision in Short"),
  p("The two options differ in one root way: how much of KOI's API the integration exposes. Everything else follows from that."),
  table([2400, 3480, 3480], [
    ["", "Option A — Custom", "Option B — Marketplace"],
    ["KOI commands", "26", "13"],
    ["Integration source", "Delivered directly by us", "Published in the Cortex Marketplace"],
    ["Updates", "We ship you a new pack version", "Marketplace update path for the integration"],
    ["Device investigation", "Yes", "Not available — no device commands"],
    ["Independent catalog risk", "Yes — Koidex risk report and search", "Not available"],
    ["Remediation / approval history", "Yes", "Not available"],
    ["Runtime (hardening) policy visibility", "Yes", "Not available"],
    ["Alert fields, type and layout in the UI", "Notification id only", "Full — 19 fields, type and layout"],
    ["Governed allow / block lists", "Yes", "Yes"],
    ["Inventory and search", "Yes", "Yes"],
    ["Event collection into XSIAM", "Yes, with fetch-time de-duplication", "Yes"],
  ]),
  h2("The short version"),
  bullet([{ text: "Choose A if investigation depth matters. ", bold: true },
          { text: "Only A can answer \"what else is on this host\", \"what does the catalog independently say about this item\", and \"what has already been done about it\"." }]),
  bullet([{ text: "Choose B if vendor-published supply chain matters more than depth. ", bold: true },
          { text: "The integration comes from the Marketplace and updates through it; the extension content adds a purpose-built alert UI on top." }]),
  p("A is the more capable option and this document does not pretend otherwise — but B is not a cut-down A. It carries alert-UI content that A does not ship today, and its integration has a supply chain some organisations require.",
    { bold: true, spacing: { before: 200 } }),
];

/* ---------------- 2. Shared baseline ---------------- */
const shared = [
  h1("2. What Both Options Give You"),
  p("These 13 commands are identical in both — same names, same arguments, same outputs. Content written against one runs against the other."),
  table([3400, 5960], [
    ["Capability", "Commands"],
    ["Event collection into koi_koi_raw", "koi-get-events"],
    ["Software inventory across the estate", "koi-inventory-list, koi-inventory-item-get, koi-inventory-search"],
    ["Which endpoints carry a given item", "koi-inventory-item-endpoints-list"],
    ["Organisation allow list", "koi-allowlist-get, -items-add, -items-remove"],
    ["Organisation block list", "koi-blocklist-get, -items-add, -items-remove"],
    ["Policy visibility and enable / disable", "koi-policy-list, koi-policy-status-update"],
  ]),
  p("Both options also ship the same shape of XSIAM content: parsing and modeling rules that normalise KOI events to the Cortex Data Model, an alerts dashboard, alert triage and investigation playbooks, an analyst-gated response playbook, and the Script Runner that executes KOI deployment scripts across the fleet on a schedule.",
    { spacing: { before: 160 } }),
  p("So the baseline is genuinely equal. The difference is what sits above it.", { bold: true }),
];

/* ---------------- 3. Custom-only ---------------- */
const customOnly = [
  h1("3. What Only the Custom Option Gives You"),
  p("Thirteen further commands, and the capabilities they make possible. This is the whole of the difference in KOI reach."),
  table([2700, 3200, 3460], [
    ["Capability", "Commands", "What it lets an analyst do"],
    ["Device-centred investigation", "koi-devices-list, koi-device-inventory-get, koi-groups-list",
     "Answer \"what else is installed on this host, and how risky is any of it\". Without these there is no device investigation at all."],
    ["Independent threat intelligence", "koi-koidex-risk-report, koi-koidex-search",
     "Get a catalog risk score, findings and an AI-written risk summary for any item — including one nobody has installed yet."],
    ["Response history", "koi-remediations-list, koi-approval-requests-list",
     "See what has already been remediated or requested for an item before deciding to block it."],
    ["Runtime hardening posture", "koi-runtime-policies-list, koi-runtime-policy-get",
     "Review agent enforcement policies and their full rule tree."],
    ["Finding vocabulary", "koi-findings-list",
     "Resolve the finding identifiers that appear in alerts into their definitions."],
    ["Identity", "koi-users-list", "List KOI users for attribution."],
    ["Collection diagnostics", "koi-fetch-context-get, koi-fetch-context-set",
     "Inspect and correct the collector's high-water-mark when investigating a collection gap."],
  ]),
  h2("Why this changes the automation, not just the command list"),
  bullet("Verdicts are corroborated. Triage weighs KOI's own alert data against the independent catalog risk, instead of relying on the alert alone."),
  bullet("Device investigation exists. An alert on a host expands into everything installed there and what is risky about it."),
  bullet("The approval gate shows history. An analyst approving an organisation-wide block sees prior remediations and approvals, not just the item."),
  bullet("Collection problems are diagnosable in place, without opening a support case to find out where the collector stopped."),
  h2("Data collection differences"),
  table([3000, 6360], [
    ["Behaviour", "Detail"],
    ["Fetch-time de-duplication", "KOI re-sends every still-open alert on each fetch. The custom integration de-duplicates within the batch and across cycles, so one alert is one alert. Without it, alert rows inflate substantially and any count over them is wrong."],
    ["Multi-tenant attribution", "Each event is stamped with the KOI tenant name and customer id, so several KOI tenants can share one dataset and stay distinguishable."],
    ["Promoted columns", "About thirty fields are lifted out of the raw JSON — item, device, MCP and governance attributes — so they are directly queryable."],
    ["Threat-hunting library", "72 saved XQL queries: 26 hunts and 46 detections across KOI and Cortex XDR data."],
  ]),
];

/* ---------------- 4. Marketplace-only ---------------- */
const mpOnly = [
  h1("4. What Only the Marketplace Option Gives You Today"),
  p("Stated plainly, because it is a real advantage and it is the half of this comparison a vendor usually leaves out."),
  table([3000, 6360], [
    ["Advantage", "Why it matters"],
    ["A vendor-published integration", "The integration is distributed and versioned through the Cortex Marketplace. Some organisations require that supply chain for anything that holds an API key."],
    ["Alert fields, type and layout", "19 KOI fields are written onto each alert and presented in a purpose-built layout, so an analyst sees item, risk, host, governance and verdict on the alert itself rather than in the war room."],
    ["Proactive hunt automation", "A scheduled hunt sweep that runs several hunts, investigates what it finds, and routes candidates to an analyst-gated block."],
    ["Supply-chain gateway content", "Triage for gateway approval requests — the exception a user files after the gateway blocks an install. Available on request; not part of the standard release."],
  ]),
  p("The alert-UI content is portable to the custom option and is planned. If the alert layout is decisive for you, ask us for the current status before choosing on that basis alone.",
    { italics: true, color: GRAY, spacing: { before: 160 } }),
];

/* ---------------- 5. Operational ---------------- */
const ops = [
  h1("5. Operational and Lifecycle Differences"),
  table([2400, 3480, 3480], [
    ["", "Option A — Custom", "Option B — Marketplace"],
    ["How you receive it", "Sent to you directly as pack source or a pack zip", "Integration from the Marketplace; extension content sent directly"],
    ["Install method", "demisto-sdk upload (required for working event collection)", "Marketplace install, then the extension by SDK upload"],
    ["Who maintains the integration", "Us", "The Marketplace publisher"],
    ["Getting a fix", "We ship a new pack version", "Integration fixes follow the publisher's release cycle"],
    ["Customisation", "Open to change — it is your pack", "The integration is fixed; the content around it is open to change"],
    ["Prerequisites", "KOI API key, an egress IP KOI accepts, Core REST API integration enabled", "Same"],
  ]),
  p("Both options require an egress IP that KOI accepts. KOI restricts its sensitive endpoints by source address, so a tenant egressing from a shared cloud range can receive HTTP 403 with a perfectly valid API key. Where that applies, run the integration on a Cortex engine whose address KOI accepts. This is the single most common cause of a deployment appearing broken, and it affects both options equally.",
    { spacing: { before: 160 } }),
];

/* ---------------- 6. Decide ---------------- */
const decide = [
  h1("6. Which Should You Choose"),
  p("Four questions settle it in most cases."),
  table([4200, 2580, 2580], [
    ["Question", "If yes", "If no"],
    ["Will analysts investigate the host, not just the item?", "Option A — device investigation needs the custom commands", "Either"],
    ["Do you want a risk opinion independent of the alert itself?", "Option A — the catalog risk report is custom-only", "Either"],
    ["Does policy require every integration to come from the Marketplace?", "Option B", "Either"],
    ["Is the on-alert field layout needed on day one?", "Option B today — ask us about the custom roadmap", "Either"],
  ]),
  h2("Our recommendation"),
  p("Option A, unless a Marketplace-published integration is a hard requirement. The difference is not a longer feature list — it is whether an analyst can answer the next question without leaving Cortex. Device context, independent catalog risk and response history are what turn an alert into a decision, and none of the three is reachable with 13 commands.",
    { bold: true }),
  p("If the Marketplace supply chain is mandatory, Option B is a sound deployment and we support it. You keep collection, inventory, governance, triage, the dashboard, the Script Runner and the alert UI. What you give up is depth of investigation, and it is worth agreeing up front how analysts will work without it.",
    { spacing: { before: 160 } }),
  hr,
  p("Both options are described in full in their own customer guides. We are happy to run a side-by-side demonstration on your tenant before you decide.",
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
      children: [new TextRun({ text: "KOI on Cortex XSIAM — Choosing Your Deployment   ·   ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ text: " / ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: "Calibri" })] })] }) },
    children: [...cover, ...toc, ...decision, ...shared, ...customOnly, ...mpOnly, ...ops, ...decide],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = __dirname + "/KOI_Deployment_Comparison_v1.0.docx";
  fs.writeFileSync(out, buf);
  console.log("written " + buf.length + " bytes -> " + out);
});
