/* Build "KOI Content Pack — Test Guide" (.pptx)
   Same dark language as the overview deck, plus green for expected results.
   Run:  NODE_PATH=<dir with pptxgenjs> node build_test_guide.js                */
const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.3 x 7.5 in — must be set before adding slides
pres.author = "Cortex XSIAM";
pres.title = "KOI Content Pack — Test Guide";

/* ---------- palette (matches build_deck.js) ---------- */
const BG = "000000";
const CARD = "15171B";
const CARD_HI = "1C2026";
const ORANGE = "E8551F";
const CYAN = "22D3EE";
const GREEN = "3FB950";
const AMBER = "F5A524";
const RED = "F04438";
const WHITE = "FFFFFF";
const BODY = "B4B7BD";
const MUTED = "6E747E";
const F = "Calibri";
const MONO = "Courier New";

const M = 0.6;
const W = 13.3 - M * 2;               // usable width = 12.1

/* ---------- helpers (fresh option objects each call — pptxgenjs mutates them) ---------- */
const newSlide = () => {
  const s = pres.addSlide();
  s.background = { color: BG };
  return s;
};

const card = (s, x, y, w, h, fill = CARD) =>
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.05,
  });

const chip = (s, x, y, label, color = ORANGE, size = 0.36) => {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w: size, h: size, fill: { color }, line: { color, width: 0 }, rectRadius: 0.09,
  });
  s.addText(label, {
    x, y, w: size, h: size, align: "center", valign: "middle",
    fontSize: 13, bold: true, color: WHITE, fontFace: F, margin: 0,
  });
};

const heading = (s, kicker, title) => {
  if (kicker)
    s.addText(kicker.toUpperCase(), {
      x: M, y: 0.42, w: W, h: 0.26, fontSize: 11, bold: true,
      color: ORANGE, fontFace: F, charSpacing: 2, margin: 0, valign: "top",
    });
  s.addText(title, {
    x: M, y: 0.70, w: W, h: 0.7, fontSize: 31, bold: true,
    color: WHITE, fontFace: F, margin: 0, valign: "top",
  });
};

const GUTTER = 0.32;                    // width reserved for the number / tick

/* How many rendered lines an item takes at a given text width. */
const wrapLines = (txt, kind, usableIn) => {
  // calibrated against the LibreOffice render; Calibri substitutes metric-compatibly,
  // and Courier New is monospace at 0.6 em, so both hold in PowerPoint
  const cpi = kind === "code" ? 0.0875 : 0.0775;             // inches per character
  const perLine = Math.max(18, Math.floor(usableIn / cpi));
  return Math.max(1, Math.ceil(txt.length / perLine));
};

/* Render each item as its own marker + text pair. A marker baked into the run
   would leave wrapped lines starting left of their own marker — pptxgenjs has no
   hanging-indent option, so the two columns are placed explicitly. */
const rowList = (s, items, x, y, w, marker) => {
  const tw = w - GUTTER;
  let cy = y;
  items.forEach((it, i) => {
    const [txt, kind] = Array.isArray(it) ? it : [it, "text"];
    const n = wrapLines(txt, kind, tw);
    s.addText(marker === "num" ? String(i + 1) : "✓", {
      x, y: cy, w: GUTTER - 0.08, h: 0.28, fontSize: 11.5, bold: true,
      color: marker === "num" ? ORANGE : GREEN, fontFace: F, margin: 0, valign: "top",
    });
    s.addText(txt, {
      x: x + GUTTER, y: cy, w: tw, h: n * 0.21 + 0.06,
      fontSize: kind === "code" ? 10.5 : 11.5,
      fontFace: kind === "code" ? MONO : F,
      color: kind === "code" ? CYAN : BODY,
      margin: 0, lineSpacing: 15, valign: "top",
    });
    cy += n * 0.205 + 0.155;
  });
  return cy - y;                                            // consumed height
};

/* ---------- testSlide: "What you need" + Steps + Expect ------------------- */
/* Every test states its own prerequisites, because the most common way a test
   "fails" is a missing tenant-side dependency rather than a defect.          */
/* Estimated rendered height of a rowList, so cards can be sized to their content
   instead of guessed — the same calibration rowList itself uses. */
const estH = (items, usableIn) => {
  const tw = usableIn - GUTTER;
  return items.reduce((h, it) => {
    const [txt, kind] = Array.isArray(it) ? it : [it, "text"];
    return h + wrapLines(txt, kind, tw) * 0.205 + 0.155;
  }, 0);
};

const testSlide = (kicker, title, needs, steps, expects, note) => {
  const s = newSlide();
  heading(s, kicker, title);

  // prerequisites strip — the amber panel every test carries
  const nh = 0.30 + needs.length * 0.235;
  card(s, M, 1.44, W, nh, CARD_HI);
  s.addText("WHAT YOU NEED FIRST", {
    x: M + 0.3, y: 1.55, w: 3.0, h: 0.22, fontSize: 9.5, bold: true,
    color: AMBER, fontFace: F, charSpacing: 1.5, margin: 0, valign: "top",
  });
  needs.forEach((n, i) => {
    s.addText("\u2022", { x: M + 3.5, y: 1.55 + i * 0.235, w: 0.16, h: 0.22,
      fontSize: 11, bold: true, color: AMBER, fontFace: F, margin: 0, valign: "top" });
    s.addText(n, { x: M + 3.72, y: 1.55 + i * 0.235, w: W - 4.1, h: 0.22,
      fontSize: 10.5, color: BODY, fontFace: F, margin: 0, valign: "top" });
  });

  const top = 1.44 + nh + 0.22;
  const sw = 7.0, ew = W - sw - 0.4, ex = M + sw + 0.4;

  // size the two columns to whichever needs more room, then clamp so the note
  // (and the slide edge at 7.5in) are never overrun
  const NOTE_H = 0.72;
  const bottom = note ? 7.5 - 0.22 - NOTE_H - 0.16 : 7.5 - 0.3;
  const need = Math.max(estH(steps, sw - 0.68), estH(expects, ew - 0.68)) + 0.86;
  const ch = Math.max(1.9, Math.min(need, bottom - top));

  card(s, M, top, sw, ch);
  s.addText("Steps", { x: M + 0.34, y: top + 0.22, w: 3.0, h: 0.28, fontSize: 12,
    bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  rowList(s, steps, M + 0.34, top + 0.62, sw - 0.68, "num");

  card(s, ex, top, ew, ch, CARD_HI);
  s.addText("What to expect", { x: ex + 0.34, y: top + 0.22, w: 3.4, h: 0.28, fontSize: 12,
    bold: true, color: GREEN, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  rowList(s, expects, ex + 0.34, top + 0.62, ew - 0.68, "tick");

  if (note) {
    const ny = top + ch + 0.16;
    card(s, M, ny, W, NOTE_H, CARD_HI);
    chip(s, M + 0.26, ny + 0.2, "!", AMBER, 0.32);
    s.addText(note, { x: M + 0.76, y: ny + 0.12, w: W - 1.1, h: NOTE_H - 0.24, fontSize: 10,
      color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
  }
  return s;
};

/* ============================ 1. Title ============================ */
{
  const s = newSlide();
  s.addShape(pres.ShapeType.ellipse, { x: 9.6, y: -2.6, w: 6.4, h: 6.4,
    fill: { color: ORANGE, transparency: 90 }, line: { color: ORANGE, width: 1 } });
  s.addText("KOI CONTENT PACK", { x: M, y: 2.5, w: W, h: 0.3, fontSize: 12, bold: true,
    color: ORANGE, fontFace: F, charSpacing: 3, margin: 0, valign: "top" });
  s.addText("Test Guide", { x: M, y: 2.9, w: W, h: 1.0, fontSize: 48, bold: true,
    color: WHITE, fontFace: F, margin: 0, valign: "top" });
  s.addText("Twelve tests that prove every part of the pack — with the tenant setup each one needs",
    { x: M, y: 3.95, w: 9.6, h: 0.4, fontSize: 15, color: BODY, fontFace: F, margin: 0, valign: "top" });
  s.addText("For anyone comfortable in the Cortex XSIAM console. No content development required.",
    { x: M, y: 4.45, w: 9.6, h: 0.4, fontSize: 12, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top" });
  s.addText("Pack 1.5.0   ·   July 2026", { x: M, y: 6.6, w: W, h: 0.3, fontSize: 11,
    color: MUTED, fontFace: F, margin: 0, valign: "top" });
  s.addNotes("Written for an operator, not a content developer. Every test names the tenant-side setup it needs before it can pass.");
}

/* ============================ 2. What ships ============================ */
{
  const s = newSlide();
  heading(s, "Contents", "What ships in the pack");
  const rows = [
    ["A", "KOI integration", "Event collector plus 26 commands — devices, inventory, catalog risk, governance.", ORANGE],
    ["B", "Parsing & modeling rules", "Normalise KOI events and map them to the Cortex Data Model.", ORANGE],
    ["C", "Alerts dashboard", "Ready-made view of KOI alert activity.", ORANGE],
    ["D", "Triage & investigation playbooks", "7 playbooks: triage, item and device investigation, gated response, MCP hunt.", CYAN],
    ["E", "Script Runner playbooks", "5 playbooks plus the KoiScanTracker automation — run KOI scripts fleet-wide.", CYAN],
    ["F", "XQL query library", "72 saved queries: 26 threat hunts and 46 detections.", GREEN],
    ["G", "Test tooling", "An event simulator, so you can test without waiting for real KOI activity.", GREEN],
  ];
  const rh = 0.64;
  rows.forEach(([g, t, d, c], i) => {
    const y = 1.5 + i * (rh + 0.11);
    card(s, M, y, W, rh);
    chip(s, M + 0.26, y + 0.16, g, c, 0.32);
    s.addText(t, { x: M + 0.76, y: y + 0.10, w: 3.7, h: 0.26, fontSize: 12, bold: true,
      color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(d, { x: M + 4.6, y: y + 0.12, w: W - 4.9, h: 0.4, fontSize: 10.5,
      color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
  });
  s.addText("Every one of these is covered by a test in this guide.", { x: M, y: 6.75, w: W, h: 0.3,
    fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top" });
}

/* ============================ 3. How to read ============================ */
{
  const s = newSlide();
  heading(s, "How to use this guide", "Every test is laid out the same way");
  const cols = [
    ["WHAT YOU NEED FIRST", AMBER, "The tenant setup this test depends on — an integration instance, a List, a script in Action Center. If something here is missing the test cannot pass, and it will look like a product fault."],
    ["STEPS", ORANGE, "What to click, in order, in the Cortex XSIAM console. Commands to paste are shown in monospace."],
    ["WHAT TO EXPECT", GREEN, "What a passing test looks like. Where a result commonly looks wrong but is correct, it says so."],
  ];
  const cw = (W - 0.6) / 3;
  cols.forEach(([t, c, d], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.6, cw, 2.5, i === 1 ? CARD : CARD_HI);
    s.addText(t, { x: x + 0.3, y: 1.85, w: cw - 0.6, h: 0.3, fontSize: 11, bold: true,
      color: c, fontFace: F, charSpacing: 1.5, margin: 0, valign: "top" });
    s.addText(d, { x: x + 0.3, y: 2.25, w: cw - 0.6, h: 1.7, fontSize: 11, color: BODY,
      fontFace: F, margin: 0, lineSpacing: 14, valign: "top" });
  });
  card(s, M, 4.35, W, 1.5, CARD_HI);
  s.addText("Run them in order the first time", { x: M + 0.34, y: 4.55, w: 5.0, h: 0.3,
    fontSize: 13, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
  s.addText("Tests 1 to 4 prove data is arriving and correct. Tests 5 to 8 prove the automation. Tests 9 and 10 prove fleet script execution — they are the only ones that need the Core REST API integration. Tests 11 and 12 are the query library and the simulator, and can be run at any time.",
    { x: M + 0.34, y: 4.92, w: W - 0.68, h: 0.8, fontSize: 11, color: BODY, fontFace: F,
      margin: 0, lineSpacing: 14, valign: "top" });
  s.addText("A test that fails on a missing prerequisite is not a product defect — check the amber panel first.",
    { x: M, y: 6.15, w: W, h: 0.3, fontSize: 11, italic: true, color: AMBER, fontFace: F, margin: 0, valign: "top" });
}

/* ============================ 4. Prerequisites ============================ */
{
  const s = newSlide();
  heading(s, "Before you begin", "Everything the pack depends on, and where to set it up");
  const hy = 1.45;
  s.addText("What",     { x: M + 0.3,  y: hy, w: 3.0, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Where in XSIAM", { x: M + 3.4, y: hy, w: 4.1, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Needed for", { x: M + 7.7, y: hy, w: 4.1, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  const rows = [
    ["KOI API key", "KOI console → Settings → API Access", "Tests 1-8, 11", CYAN],
    ["KOI integration instance", "Settings → Data Sources → Add → KOI", "Tests 1-8, 11", CYAN],
    ["An egress IP KOI accepts", "Run the instance on a Cortex engine if needed", "Tests 1-8, 11", AMBER],
    ["Core REST API instance", "Settings → Data Sources → Add → Core REST API", "Tests 9-10 only", AMBER],
    ["KOI script in Action Center", "Action Center → Scripts Library → upload", "Tests 9-10", CYAN],
    ["An endpoint group", "Endpoints → Endpoint Groups", "Tests 9-10", CYAN],
    ["\"Koi Script Runner\" JSON List", "Settings → Object Setup → Lists", "Tests 9-10", CYAN],
    ["Mail sender instance (optional)", "Settings → Data Sources", "Tests 9-10 notifications", MUTED],
  ];
  const rh = 0.44;
  rows.forEach(([a, b, c, col], i) => {
    const y = 1.78 + i * (rh + 0.07);
    card(s, M, y, W, rh);
    s.addText(a, { x: M + 0.3, y: y + 0.12, w: 3.0, h: 0.26, fontSize: 10.5, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(b, { x: M + 3.4, y: y + 0.12, w: 4.2, h: 0.26, fontSize: 10, color: BODY, fontFace: F, margin: 0, valign: "top" });
    s.addText(c, { x: M + 7.7, y: y + 0.12, w: 4.1, h: 0.26, fontSize: 10, bold: true, color: col, fontFace: F, margin: 0, valign: "top" });
  });
  card(s, M, 6.05, W, 0.85, CARD_HI);
  chip(s, M + 0.26, 6.3, "!", AMBER, 0.32);
  s.addText("The Core REST API instance is the one people miss. The Script Runner uses it to read endpoint groups larger than 100 — without it the tracker stays empty and every scan run does nothing, which looks exactly like a broken playbook.",
    { x: M + 0.76, y: 6.18, w: W - 1.1, h: 0.6, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
}

/* ============================ 5. Install ============================ */
{
  const s = newSlide();
  heading(s, "Installation", "Two ways in — only one collects events");
  const hy = 1.5;
  s.addText("Method", { x: M + 0.3, y: hy, w: 3.0, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("What lands", { x: M + 3.5, y: hy, w: 5.2, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Events?", { x: M + 8.9, y: hy, w: 1.4, h: 0.26, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  const paths = [
    ["demisto-sdk upload", "Everything — integration, playbooks, rules, dashboard", true],
    ["Pack zip upload", "Content only. The collector and rules do not activate", false],
  ];
  paths.forEach(([a, b, ok], i) => {
    const y = 1.85 + i * 0.78;
    card(s, M, y, W, 0.66, ok ? CARD : CARD_HI);
    s.addText(a, { x: M + 0.3, y: y + 0.2, w: 3.1, h: 0.3, fontSize: 12, bold: true, color: ok ? WHITE : AMBER, fontFace: F, margin: 0, valign: "top" });
    s.addText(b, { x: M + 3.5, y: y + 0.21, w: 5.3, h: 0.3, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, valign: "top" });
    s.addText(ok ? "✓ yes" : "✗ no", { x: M + 8.9, y: y + 0.2, w: 1.4, h: 0.3, fontSize: 12, bold: true, color: ok ? GREEN : RED, fontFace: F, margin: 0, valign: "top" });
  });
  card(s, M, 3.5, W, 1.35, CARD_HI);
  s.addText("Ask whoever sent you the pack to install it", { x: M + 0.34, y: 3.68, w: 8.0, h: 0.3, fontSize: 12.5, bold: true, color: GREEN, fontFace: F, margin: 0, valign: "top" });
  s.addText("Installing with demisto-sdk is a developer task and needs a Standard XSIAM API key. If you are testing rather than deploying, have it installed for you and start at Test 1. Nothing else in this guide needs a developer.",
    { x: M + 0.34, y: 4.05, w: W - 0.68, h: 0.7, fontSize: 11, color: BODY, fontFace: F, margin: 0, lineSpacing: 14, valign: "top" });
  card(s, M, 5.05, W, 1.5, CARD_HI);
  s.addText("Confirm it landed", { x: M + 0.34, y: 5.22, w: 4.0, h: 0.3, fontSize: 12.5, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
  rowList(s, [
    "Settings → Data Sources — a KOI integration is offered.",
    "Automation → Playbooks — 12 playbooks whose names start with KOI.",
    "Dashboards & Reports — the KOI Alerts Dashboard exists.",
  ], M + 0.34, 5.6, W - 0.68, "tick");
}

/* ============================ 6. The test plan ============================ */
{
  const s = newSlide();
  heading(s, "Test plan", "Twelve tests, four groups");
  const groups = [
    ["Data is arriving and correct", ORANGE, ["1  Connectivity", "2  Event collection", "3  Parsing & data model", "4  Dashboard"]],
    ["The automation works", CYAN, ["5  Alert triage", "6  Item & device investigation", "7  Gated response", "8  MCP server hunt"]],
    ["Fleet script execution", AMBER, ["9  Refresh the tracker", "10  Scan due endpoints"]],
    ["Extras, any time", GREEN, ["11  Threat-hunting library", "12  Simulated test data"]],
  ];
  let y = 1.5;
  groups.forEach(([t, c, items]) => {
    const h = 0.52 + Math.ceil(items.length / 4) * 0.42;
    card(s, M, y, W, h);
    s.addText(t, { x: M + 0.32, y: y + 0.16, w: 5.0, h: 0.28, fontSize: 12.5, bold: true, color: c, fontFace: F, margin: 0, valign: "top" });
    items.forEach((it, j) => {
      s.addText(it, { x: M + 0.32 + j * 2.95, y: y + 0.56, w: 2.85, h: 0.28, fontSize: 11, color: BODY, fontFace: F, margin: 0, valign: "top" });
    });
    y += h + 0.16;
  });
  card(s, M, y, W, 0.8, CARD_HI);
  chip(s, M + 0.26, y + 0.23, "!", AMBER, 0.32);
  s.addText("Only tests 9 and 10 need the Core REST API integration. Only tests 1-8 and 11 need a KOI API key. Test 12 needs neither and is the fastest way to see the pack working.",
    { x: M + 0.76, y: y + 0.16, w: W - 1.1, h: 0.55, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
  s.addNotes("Grouping by dependency, not just by order, so a tester who is blocked on one prerequisite can still make progress elsewhere.");
}

testSlide("Test 1", "Connectivity and authorisation",
  ["A KOI API key (KOI console → Settings → API Access)",
   "Permission to add an integration instance in XSIAM"],
  ["Settings → Data Sources → Add an instance → search KOI.",
   ["Server URL:  https://api.prod.koi.security/", "code"],
   "Paste the API key. Optionally set a Tenant Name label.",
   "Click Test, then Save.",
   "Open the CLI at the bottom of any incident and run:",
   ["!koi-devices-list limit=5", "code"]],
  ["Test returns Success.",
   "The command returns a table of up to five devices.",
   "If you set a Tenant Name it will appear on collected events later."],
  "A 403 here almost always means egress, not a bad key: KOI restricts its sensitive endpoints by source IP. Run the instance on a Cortex engine whose address KOI accepts. A 401 means the key itself."
).addNotes("Egress is the single most common deployment problem and it is not obvious from the error.");

testSlide("Test 2", "Event collection",
  ["Test 1 passing", "Fetch events enabled on the KOI instance"],
  ["Edit the KOI instance and tick Fetch events.",
   "Choose which event types to collect, then Save.",
   "Wait for two collection cycles.",
   "Open Incident Response → Investigation → Query Builder and run:",
   ["dataset = koi_koi_raw", "code"],
   ["| comp count() as rows by source_log_type", "code"]],
  ["Rows appear under Alerts, Audit, or both.",
   "Counts grow between cycles."],
  "No rows at all usually means fetch was only just enabled — give it two cycles. Audit missing on its own means the Audit types filter is narrowed; leave it empty for all types."
);

testSlide("Test 3", "Parsing and the data model",
  ["Test 2 passing — events present in koi_koi_raw"],
  ["In Query Builder, count real alerts rather than rows:",
   ["dataset = koi_koi_raw", "code"],
   ['| filter source_log_type = "Alerts"', "code"],
   ['| alter nid = json_extract_scalar(metadata, "$.notification_event_id")', "code"],
   ["| comp count() as rows, count_distinct(nid) as real_alerts", "code"]],
  ["Both numbers return.",
   "rows is larger than real_alerts — often much larger.",
   "Fields such as item_id, alert_hostname and risk_level are populated and directly queryable."],
  "rows far exceeding real_alerts is CORRECT. KOI re-sends every still-open alert on each fetch, so a row is a delivery, not an alert. Anything counting alerts must count distinct notification ids — the dashboard already does."
).addNotes("This is the number one thing testers misread as a duplication bug.");

testSlide("Test 4", "Dashboard",
  ["Test 2 passing — events present"],
  ["Dashboards & Reports → open the KOI Alerts Dashboard.",
   "Read the alert totals, risk mix and top items.",
   "Come back after another collection cycle and compare."],
  ["Widgets render with data.",
   "Alert counts are far lower than the raw row count from Test 3.",
   "Counts stay stable as fetches repeat — they do not climb on their own."],
  "A widget whose number climbs steadily while nothing new happens in KOI would be counting deliveries rather than alerts. Every widget in this pack de-duplicates first."
);

testSlide("Test 5", "Alert triage",
  ["Test 1 passing — the KOI integration answers",
   "A KOI alert in XSIAM (a correlation rule over koi_koi_raw, or Test 12 for simulated data)"],
  ["Open a KOI alert.",
   "Attach the triage playbook, or run from the CLI:",
   ['!setPlaybook playbookId="KOI IR - Alert Triage"', "code"],
   "Watch the Work Plan, then read the War Room."],
  ["Context is extracted: item, marketplace, risk, host.",
   "A verdict is posted: Malicious, Suspicious or Benign.",
   "Low risk auto-closes; critical and high escalate.",
   "Medium and pending stay open for a human."],
  "Everything coming out Suspicious usually means the alert carried no KOI detail for the playbook to read. Check the correlation rule passes the KOI fields through. Pending means KOI has not finished scoring — it deliberately never auto-closes."
);

testSlide("Test 6", "Item and device investigation",
  ["Test 1 passing", "An item id and its marketplace, and a device id — both visible on any KOI alert"],
  ["Automation → Playbooks → KOI IR - Investigate Item → Run.",
   "Supply item_id and marketplace.",
   "Repeat with KOI IR - Investigate Device and a device id."],
  ["An investigation summary with catalog risk and an AI-written summary.",
   "Organisation exposure: installs, endpoints, affected users.",
   "Both governance counts — on blocklist AND on allowlist.",
   "For the device: everything installed on that host, and which of it is risky."],
  "Both governance counts matter. Zero blocklist hits alone does not mean nobody has governed the item — it may have been explicitly allowed, and blocking it would override that decision."
);

testSlide("Test 7", "Gated response",
  ["Test 1 passing", "An item id and marketplace", "Permission to approve a task"],
  ["Automation → Playbooks → KOI IR - Block and Remediate → Run.",
   "Supply item_id and marketplace.",
   "Open the pending approval task and read it.",
   "Approve, or leave it pending."],
  ["The run PARKS on an approval task and waits.",
   "The approval shows the full investigation and both governance counts.",
   "Nothing reaches the blocklist until a human approves.",
   "An item already blocked short-circuits instead of being added twice."],
  "This is the test to repeat after any change to the response playbook. If a run ever completes without stopping for approval, stop and investigate before using the pack in production."
).addNotes("The only state-changing action in the pack. Treat this as the production gate.");

testSlide("Test 8", "MCP server hunt",
  ["Test 1 passing — the KOI integration answers"],
  ["Automation → Playbooks → KOI Hunting - MCP Server Audit → Run.",
   "Optionally set risk_levels (default high, critical).",
   "Read the War Room table.",
   "To schedule it: Automation → Jobs → New Job, time-triggered."],
  ["A table of MCP servers at or above the risk threshold.",
   "An empty table is a valid result — it means nothing risky is installed."],
  "This asks KOI what it has already scored. It finds risky agentic-AI assets without waiting for an alert about them."
);

testSlide("Test 9", "Script Runner — refresh the tracker",
  ["Core REST API integration instance configured  ← the one people miss",
   "A KOI script uploaded in Action Center → Scripts Library (it must take no parameters)",
   "An endpoint group containing your agents",
   'A JSON List named exactly "Koi Script Runner"'],
  ["Settings → Object Setup → Lists → New List, type JSON, named Koi Script Runner.",
   "Give each entry a script name, endpoint_os, endpoint group, tracker_list and rescan_interval_hours.",
   "Automation → Jobs → New Job → time-triggered → playbook KOI Script Runner - Refresh Job.",
   "Enable the Job, then use Run now."],
  ["A tracker List appears under Lists, named as in your entry.",
   "It fills with one row per endpoint: an id and a last-scan value.",
   "Re-running adds new endpoints without disturbing existing rows."],
  "Without a Core REST API instance this test cannot pass — the refresh reads endpoint groups through it. The tracker simply stays empty, which looks like a broken playbook."
).addNotes("Refresh must run before Scan. An empty tracker means Scan has nothing to do.");

testSlide("Test 10", "Script Runner — scan due endpoints",
  ["Test 9 passing — the tracker List has rows",
   "Connected agents in the group, matching the entry's endpoint_os"],
  ["Automation → Jobs → New Job → time-triggered → playbook KOI Script Runner - Scan Job.",
   "Enable the Job, then Run now.",
   "Open the run, then check Action Center.",
   "Run it a second time immediately."],
  ["The script is dispatched to due, connected endpoints.",
   "Those endpoints get a last-scan timestamp in the tracker.",
   "Offline, wrong-OS and unknown endpoints stay due and retry later.",
   "The second run does nothing — everything is inside the rescan interval."],
  "SKIPPED means nothing is due right now and sends no email, by design. STILL RUNNING means the script was dispatched and Action Center is finishing on its own. Neither is a failure."
);

testSlide("Test 11", "Threat-hunting query library",
  ["Test 2 passing — events present",
   "Cortex XDR data for the cross-dataset hunts (optional)"],
  ["Open docs/xql in the pack you were sent.",
   "Read QUERY_LIBRARY.md first — it explains the rules.",
   "Paste a hunt into Query Builder, starting with H2.1.",
   "Try a detection too, for example A1."],
  ["Each query runs and returns rows, or a clean empty result.",
   "Hunts surface findings KOI scored that nobody actioned.",
   "26 hunts and 46 detections are included."],
  "These read raw event fields, so they keep working regardless of the modeling rule. An empty result is a valid answer, not a failure."
);

testSlide("Test 12", "Simulated test data",
  ["The KoiSimulateEvents automation imported (ships in TestTools)",
   "No KOI API key and no Core REST API needed"],
  ["Open the CLI on any incident.",
   "Run:",
   ["!KoiSimulateEvents alerts=40 duplicate_factor=8 audit=60", "code"],
   "Read the summary it prints — it tells you the answers in advance.",
   "Query koisim_koisim_raw to check them."],
  ["380 events land in koisim_koisim_raw.",
   "40 distinct alerts delivered 8 times each, as real KOI does.",
   "The counts you measure match the summary exactly."],
  "It writes to its own dataset, never koi_koi_raw, so it cannot disturb real data. Use it to see the pack working before real KOI activity exists."
).addNotes("Fastest possible demo: no KOI key, no waiting, and the expected numbers are printed up front.");

/* ============================ Troubleshooting ============================ */
{
  const s = newSlide();
  heading(s, "If something fails", "Check the prerequisite before the product");
  const rows = [
    ["403 on KOI commands", "Source IP not accepted by KOI", "Run the instance on a Cortex engine KOI accepts"],
    ["401 on KOI commands", "The API key itself", "Re-create the key with the xt-Administrator role"],
    ["Engine is not connected", "The Cortex engine is offline", "Every koi- command fails before reaching KOI. Restart the engine"],
    ["No events after enabling fetch", "Only one cycle has run", "Wait two cycles, then re-check Test 2"],
    ["Everything triages as Suspicious", "The alert carried no KOI detail", "Check the correlation rule passes KOI fields through"],
    ["Tracker List stays empty", "No Core REST API instance", "Configure it — Test 9 cannot pass without it"],
    ["Scan run does nothing", "Refresh has not run yet", "Run the Refresh job first; an empty tracker means nothing is due"],
    ["A Job never fires", "It was created disabled", "Enable it and confirm a next-run time is shown"],
  ];
  const y0 = 1.5, rh = 0.5;
  rows.forEach(([sym, cause, fix], i) => {
    const y = y0 + i * (rh + 0.11);
    card(s, M, y, W, rh);
    s.addText(sym, { x: M + 0.3, y: y + 0.14, w: 3.3, h: 0.26, fontSize: 11, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(cause, { x: M + 3.8, y: y + 0.15, w: 3.4, h: 0.26, fontSize: 10, color: AMBER, fontFace: F, margin: 0, valign: "top" });
    s.addText(fix, { x: M + 7.4, y: y + 0.15, w: W - 7.7, h: 0.26, fontSize: 10, color: BODY, fontFace: F, margin: 0, valign: "top" });
  });
  s.addText("Six of these eight are tenant setup, not the pack. Check the amber panel on the test before raising a defect.",
    { x: M, y: y0 + 8 * (rh + 0.11) + 0.1, w: W, h: 0.3, fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top" });
}

/* ============================ Sign-off ============================ */
{
  const s = newSlide();
  s.addShape(pres.ShapeType.ellipse, { x: 11.4, y: -3.4, w: 4.8, h: 4.8,
    fill: { color: GREEN, transparency: 93 }, line: { color: GREEN, width: 1 } });
  heading(s, "Sign-off", "One line of evidence per test");
  const checks = [
    ["1", "Test returns Success; devices list returns rows"],
    ["2", "koi_koi_raw grows between collection cycles"],
    ["3", "Distinct alerts far below raw rows — and that is correct"],
    ["4", "Dashboard renders; counts stay stable across fetches"],
    ["5", "A verdict is reached; low risk auto-closes"],
    ["6", "Investigation shows catalog risk and both governance counts"],
    ["7", "Response parks on approval; blocklist untouched until approved"],
    ["8", "MCP audit returns servers at or above the threshold"],
    ["9", "Tracker List is created and fills with endpoints"],
    ["10", "Scan marks only due, connected endpoints; re-run is a no-op"],
    ["11", "Library queries run and return results"],
    ["12", "Simulated counts match the summary exactly"],
  ];
  const cw = (W - 0.4) / 2;
  checks.forEach(([n, t], i) => {
    const col = i < 6 ? 0 : 1, row = i < 6 ? i : i - 6;
    const x = M + col * (cw + 0.4), y = 1.55 + row * 0.72;
    card(s, x, y, cw, 0.6);
    chip(s, x + 0.22, y + 0.13, n, GREEN, 0.34);
    s.addText(t, { x: x + 0.74, y: y + 0.15, w: cw - 0.98, h: 0.36, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
  });
  card(s, M, 5.95, W, 0.75, CARD_HI);
  s.addText("All twelve green — the pack is ready for production use.", { x: M + 0.34, y: 6.15, w: 8.0, h: 0.32,
    fontSize: 13, bold: true, italic: true, color: GREEN, fontFace: F, margin: 0, valign: "top" });
  s.addText("Full detail in KOI_Integration_Customer_Guide_v1.4.0. Diagnostics in the troubleshooting guide.",
    { x: M, y: 6.85, w: W, h: 0.3, fontSize: 10.5, color: MUTED, fontFace: F, margin: 0, valign: "top" });
}

const out = path.join(__dirname, "KOI_Content_Pack_Test_Guide.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("written", out));
