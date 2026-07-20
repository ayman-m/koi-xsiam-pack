/* Build "KOI Content Pack — Test Guide" (.pptx)
   Same dark language as the overview deck, plus green for expected results.
   Run:  NODE_PATH=<dir with pptxgenjs> node build_test_guide.js                */
const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.3 x 7.5 in — must be set before adding slides
pres.author = "Cortex XSOAR";
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

/* Estimate rendered height so each card hugs its content — step counts vary from
   four to eight across the tests, so one fixed height leaves the short ones hollow. */
const estH = (items, usableIn) =>
  items.reduce((h, it) => {
    const [txt, kind] = Array.isArray(it) ? it : [it, "text"];
    return h + wrapLines(txt, kind, usableIn - GUTTER) * 0.205 + 0.155;
  }, 0);

/* one test slide: numbered steps on the left, expected results on the right */
const testSlide = (kicker, title, steps, expects, note) => {
  const s = newSlide();
  heading(s, kicker, title);
  const sw = 7.0, ew = W - sw - 0.4, ex = M + sw + 0.4;
  const need = Math.max(estH(steps, sw - 0.68), estH(expects, ew - 0.68));
  const ch = Math.min(note ? 4.30 : 5.05, Math.max(2.35, need + 0.96));

  card(s, M, 1.58, sw, ch);
  s.addText("Steps", {
    x: M + 0.34, y: 1.82, w: 3.0, h: 0.3, fontSize: 12.5, bold: true,
    color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top",
  });
  rowList(s, steps, M + 0.34, 2.24, sw - 0.68, "num");

  card(s, ex, 1.58, ew, ch, CARD_HI);
  s.addText("What to expect", {
    x: ex + 0.34, y: 1.82, w: 3.4, h: 0.3, fontSize: 12.5, bold: true,
    color: GREEN, fontFace: F, charSpacing: 1, margin: 0, valign: "top",
  });
  rowList(s, expects, ex + 0.34, 2.24, ew - 0.68, "tick");

  if (note) {
    const ny = 1.58 + ch + 0.24;                 // follows the cards instead of a fixed y
    card(s, M, ny, W, 0.92, CARD_HI);
    chip(s, M + 0.28, ny + 0.27, "!", AMBER, 0.34);
    s.addText(note, {
      x: M + 0.82, y: ny + 0.19, w: W - 1.2, h: 0.6, fontSize: 10.5,
      color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top",
    });
  }
  return s;
};

/* ============================ 1. Title ============================ */
{
  const s = newSlide();
  s.addShape(pres.ShapeType.ellipse, {
    x: 9.3, y: -1.6, w: 6.0, h: 6.0,
    fill: { color: GREEN, transparency: 93 }, line: { color: GREEN, width: 1 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.8, y: 3.5, w: 3.4, h: 3.4,
    fill: { color: ORANGE, transparency: 93 }, line: { color: ORANGE, width: 1 },
  });
  s.addText("KOI CONTENT PACK  ·  ACCEPTANCE TESTING", {
    x: M, y: 1.75, w: W, h: 0.3, fontSize: 12, bold: true,
    color: ORANGE, fontFace: F, charSpacing: 3, margin: 0, valign: "top",
  });
  s.addText("Test Guide", {
    x: M, y: 2.05, w: 8.6, h: 1.35, fontSize: 66, bold: true,
    color: WHITE, fontFace: F, margin: 0, valign: "top",
  });
  s.addText("Nine tests that prove every part of the pack works on your tenant — and what a pass looks like for each.", {
    x: M, y: 3.62, w: 8.4, h: 0.9, fontSize: 17, color: BODY, fontFace: F,
    margin: 0, lineSpacing: 24, valign: "top",
  });
  const stats = [["9", "tests"], ["~45", "minutes"], ["1", "tenant"], ["0", "risk to prod"]];
  stats.forEach(([n, l], i) => {
    const x = M + i * 2.05;
    s.addText(n, { x, y: 4.95, w: 1.9, h: 0.6, fontSize: 34, bold: true, color: GREEN, fontFace: F, margin: 0, valign: "top" });
    s.addText(l, { x, y: 5.55, w: 1.9, h: 0.3, fontSize: 11, color: MUTED, fontFace: F, margin: 0, valign: "top" });
  });
  s.addNotes("Work top to bottom. Tests 1-4 prove the plumbing, 5-8 prove the automation, 9 proves fleet execution. Test 7 is the safety gate and must pass before production use.");
}

/* ============================ 2. Requirements ============================ */
{
  const s = newSlide();
  heading(s, "Requirements", "What you need, by what you are deploying");
  s.addText("The two deployments have very different prerequisites. Pick your column before you start.", {
    x: M, y: 1.42, w: 9.8, h: 0.34, fontSize: 12.5, color: BODY, fontFace: F, margin: 0, valign: "top",
  });
  const cols = [
    ["Full pack", ORANGE, "Collection, triage, investigation and response", [
      "Cortex XSIAM tenant — the parsing and modeling rules are fromversion 8.4.0",
      "A KOI API key with the xt-Administrator role",
      "An egress IP KOI accepts, or a Cortex engine that has one",
      "demisto-sdk 1.38+ and a Standard XSIAM API key",
      "At least one ingested KOI alert, for tests 5 to 7",
    ]],
    ["Script Runner only", CYAN, "Run KOI scripts on endpoints from a Job", [
      "Cortex XSIAM or XSOAR with Cortex agents installed",
      "The KOI script package uploaded to Action Center → Scripts Library",
      "An endpoint group containing connected, unisolated agents",
      "Optionally a mail-sender instance for notifications",
      "No KOI API key and no KOI integration instance",
    ]],
  ];
  const cw = (W - 0.4) / 2;
  cols.forEach(([t, c, sub, items], i) => {
    const x = M + i * (cw + 0.4);
    card(s, x, 1.92, cw, 4.5, i ? CARD_HI : CARD);
    s.addText(t, { x: x + 0.34, y: 2.14, w: cw - 0.68, h: 0.34, fontSize: 16, bold: true, color: c, fontFace: F, margin: 0, valign: "top" });
    s.addText(sub, { x: x + 0.34, y: 2.52, w: cw - 0.68, h: 0.3, fontSize: 11, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top" });
    rowList(s, items, x + 0.34, 2.98, cw - 0.68, "tick");
  });
  s.addText("The Script Runner playbooks call no koi-* command at all — only core-get-scripts, core-get-endpoints and core-script-run.", {
    x: M, y: 6.6, w: W, h: 0.3, fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top",
  });
  s.addNotes("Verified against the playbook YAML: the three Koi Unified playbooks invoke no KOI API command, so a script-only customer needs neither a KOI key nor an integration instance.");
}

/* ============================ 3. Install paths ============================ */
{
  const s = newSlide();
  heading(s, "Installation", "Choose your path — it decides whether events flow");
  const hy = 1.56;
  s.addText("Path",        { x: M + 0.3,  y: hy, w: 2.7, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("What lands",  { x: M + 3.2,  y: hy, w: 4.4, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Events?",     { x: M + 7.9,  y: hy, w: 1.1, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Use when",    { x: M + 9.1,  y: hy, w: 2.7, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  const paths = [
    ["Marketplace", "Integration, rules, dashboard and playbooks", true, "Production tenants"],
    ["demisto-sdk --xsiam", "Everything, at the version in your repo", true, "Dev/test and CI"],
    ["Pre-built dist/Koi.zip", "Integration + 3 playbooks only. No rules, no dashboard", false, "Not for XSIAM"],
    ["Manual per-item", "Only the items you import yourself", false, "Partial adoption"],
  ];
  const ry = 1.94, rh = 0.66;
  paths.forEach(([p, lands, ok, when], i) => {
    const y = ry + i * (rh + 0.15);
    card(s, M, y, W, rh, i === 2 ? CARD_HI : CARD);
    s.addText(p,     { x: M + 0.3, y: y + 0.19, w: 2.7, h: 0.5, fontSize: 11.5, bold: true, color: i === 2 ? AMBER : WHITE, fontFace: F, margin: 0, lineSpacing: 13, valign: "top" });
    s.addText(lands, { x: M + 3.2, y: y + 0.19, w: 4.4, h: 0.5, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top" });
    s.addText(ok ? "✓ yes" : "✗ no", { x: M + 7.9, y: y + 0.19, w: 1.1, h: 0.3, fontSize: 11.5, bold: true, color: ok ? GREEN : RED, fontFace: F, margin: 0, valign: "top" });
    s.addText(when,  { x: M + 9.1, y: y + 0.19, w: 2.7, h: 0.5, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top" });
  });
  card(s, M, 5.28, W, 0.98, CARD_HI);
  chip(s, M + 0.28, 5.58, "!", AMBER, 0.34);
  s.addText("The pre-built zip is an XSOAR-marketplace build: inside it the collector flag is isfetchevents: false, and it ships no parsing or modeling rules. Upload it to XSIAM and the commands work, but koi_koi_raw stays empty forever. Event collection needs the Marketplace or a demisto-sdk --xsiam upload.", {
    x: M + 0.82, y: 5.46, w: W - 1.2, h: 0.66, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top",
  });
  s.addNotes("This is the single most consequential choice in the guide. A zip upload produces a tenant where every command works and no data ever arrives — which reads like a collector bug but is simply the wrong artifact.");
}

/* ============================ 4. Install the full pack ============================ */
{
  const s = newSlide();
  heading(s, "Installation", "Full pack with demisto-sdk");
  const sw = 7.0, ew = W - sw - 0.4, ex = M + sw + 0.4;
  card(s, M, 1.58, sw, 4.55);
  s.addText("Steps", { x: M + 0.34, y: 1.82, w: 3.0, h: 0.3, fontSize: 12.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  rowList(s, [
    "Install the SDK — 1.38+, older versions reject the platform marketplace.",
    ["pip3 install demisto-sdk", "code"],
    "Place the pack at Packs/Koi inside a content-repo scaffold.",
    "Copy Packs/ApiModules/Scripts/ContentClientApiModule/ from demisto/content.",
    "Point the SDK at the tenant:",
    ["export DEMISTO_BASE_URL=https://api-<tenant>...", "code"],
    ["export DEMISTO_API_KEY=<standard-key>", "code"],
    ["export XSIAM_AUTH_ID=<key-id>", "code"],
    ["demisto-sdk upload -i Packs/Koi -z --xsiam", "code"],
  ], M + 0.34, 2.24, sw - 0.68, "num");

  card(s, ex, 1.58, ew, 4.55, CARD_HI);
  s.addText("What to expect", { x: ex + 0.34, y: 1.82, w: 3.4, h: 0.3, fontSize: 12.5, bold: true, color: GREEN, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  rowList(s, [
    "The pack appears on the tenant at its version.",
    "Integration, playbooks, rules and dashboard all land together.",
    "Fetch events is available on the instance.",
  ], ex + 0.34, 2.24, ew - 0.68, "tick");

  card(s, M, 6.25, W, 0.85, CARD_HI);
  chip(s, M + 0.28, 6.5, "!", AMBER, 0.34);
  s.addText("The SDK sends the API key as-is, so it works only with a Standard XSIAM key. With an Advanced key the SDK cannot connect — build with zip-packs and POST the artifact to /xsoar/contentpacks/installed/upload with signed headers instead.", {
    x: M + 0.82, y: 6.38, w: W - 1.2, h: 0.6, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top",
  });
  s.addNotes("Pack-installed items become system-owned and reject individual item uploads afterwards — ship later changes as a new pack version.");
}

/* ============================ 5. Script Runner only ============================ */
{
  const s = newSlide();
  heading(s, "Installation", "Script Runner only — the minimal import");
  s.addText("To run KOI scripts from an XSIAM Job and nothing else, import these four items by hand. Nothing else in the pack is required.", {
    x: M, y: 1.42, w: 10.4, h: 0.34, fontSize: 12.5, color: BODY, fontFace: F, margin: 0, valign: "top",
  });
  const items = [
    ["1", "Koi Unified - Execute Endpoint Script", "Playbooks → Import", "Import first — the others reference it by name.", CYAN],
    ["2", "Koi Unified - Process Config Entry", "Playbooks → Import", "Import second — calls the executor above.", CYAN],
    ["3", "Koi Unified - Script Runner", "Playbooks → Import", "Import third — the Job entry point.", CYAN],
    ["4", "Koi Script Runner", "Object Setup → Lists, type JSON", "The configuration array. Name must be exact.", ORANGE],
  ];
  const rh = 0.84;
  items.forEach(([n, name, where, note, c], i) => {
    const y = 1.9 + i * (rh + 0.16);
    card(s, M, y, W, rh);
    chip(s, M + 0.28, y + 0.24, n, c, 0.34);
    s.addText(name,  { x: M + 0.82, y: y + 0.16, w: 4.4, h: 0.28, fontSize: 12, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(where, { x: M + 0.82, y: y + 0.46, w: 4.4, h: 0.26, fontSize: 10, color: MUTED, fontFace: F, margin: 0, valign: "top" });
    s.addText(note,  { x: M + 5.5,  y: y + 0.28, w: W - 5.8, h: 0.3, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, valign: "top" });
  });
  card(s, M, 5.92, W, 1.06, CARD_HI);
  s.addText("Then create the Job", { x: M + 0.32, y: 6.06, w: 3.4, h: 0.28, fontSize: 11.5, bold: true, color: GREEN, fontFace: F, margin: 0, valign: "top" });
  s.addText("Automation → Jobs → New Job, Time-triggered, playbook Koi Unified - Script Runner. You do NOT need the KOI integration, an API key, the parsing or modeling rules, the dashboard, or any of the seven KOI triage playbooks — the Script Runner set calls no KOI API command.", {
    x: M + 0.32, y: 6.38, w: W - 0.64, h: 0.5, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top",
  });
  s.addNotes("Import order matters because sub-playbook references bind by name — importing the parent first leaves it pointing at a playbook that does not exist yet.");
}

/* ============================ 6. Naming requirements ============================ */
{
  const s = newSlide();
  heading(s, "Requirements", "Names that must match exactly");
  s.addText("Everything below binds by name at run time. A mismatch does not raise a config error — it fails or silently skips at the next run.", {
    x: M, y: 1.42, w: 10.6, h: 0.34, fontSize: 12.5, color: BODY, fontFace: F, margin: 0, valign: "top",
  });
  const hy = 1.9;
  s.addText("Name or key",   { x: M + 0.3, y: hy, w: 3.6, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("Must match",    { x: M + 4.1, y: hy, w: 3.5, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  s.addText("If it does not", { x: M + 7.8, y: hy, w: 4.0, h: 0.28, fontSize: 10.5, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0, valign: "top" });
  const binds = [
    ["Koi Script Runner", "The JSON List name, character for character", "Job runs, does nothing, prints \"no valid configuration found\""],
    ["script.name", "A script in Action Center → Scripts Library", "Fails: \"script name was not found in the library\""],
    ["script.uuid", "Optional. Wins over script.name when set", "Two library entries with one name fail as \"multiple scripts matched\""],
    ["target.endpoint_groups", "An existing endpoint group with agents in it", "Entry is SKIPPED — an info entry, no failure email"],
    ["target.endpoint_os", "Windows, macOS or Linux", "Entry is reported invalid and skipped"],
    ["sendmail_instance.name", "An enabled mail instance, if notifications are on", "Notification step fails"],
    ["Sub-playbook names", "KOI - / Koi Unified - names, unrenamed", "Parent cannot resolve the sub-playbook"],
  ];
  const rh = 0.54;
  binds.forEach(([k, m, f], i) => {
    const y = 2.24 + i * (rh + 0.09);
    card(s, M, y, W, rh);
    s.addText(k, { x: M + 0.3, y: y + 0.16, w: 3.6, h: 0.28, fontSize: 10.5, bold: true, color: CYAN, fontFace: MONO, margin: 0, valign: "top" });
    s.addText(m, { x: M + 4.1, y: y + 0.16, w: 3.5, h: 0.28, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, valign: "top" });
    s.addText(f, { x: M + 7.8, y: y + 0.16, w: 4.0, h: 0.28, fontSize: 10.5, color: AMBER, fontFace: F, margin: 0, valign: "top" });
  });
  s.addText("The List name is fixed in the playbook task — XSOAR cannot parameterise ${lists.<name>}. To use another name you must edit the task.", {
    x: M, y: 6.66, w: W, h: 0.3, fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top",
  });
  s.addNotes("Every one of these is a by-name binding taken from the playbook YAML. The skipped-entry case is the quietest: a valid entry with no matching connected endpoint logs an info entry and deliberately sends no email.");
}

/* ============================ 3. The test plan ============================ */
{
  const s = newSlide();
  heading(s, "Test plan", "What you are going to prove");
  const tests = [
    ["1", "Connectivity & authorisation", "The key works and your egress is accepted", ORANGE],
    ["2", "Event collection", "Alerts and audit logs land in koi_koi_raw", ORANGE],
    ["3", "Command surface", "The read commands return live tenant data", ORANGE],
    ["4", "Dashboard & data model", "Events are normalised and visualised", ORANGE],
    ["5", "Alert triage end to end", "Every alert is investigated and classified", CYAN],
    ["6", "The two investigations", "Item and device context is gathered", CYAN],
    ["7", "Gated response", "Nothing is blocked without a human", GREEN],
    ["8", "Scheduled hunt", "Risky MCP servers surface without an alert", CYAN],
    ["9", "Script Runner job", "KOI scripts run on Cortex-Agent endpoints", ORANGE],
  ];
  const cw = (W - 0.6) / 3, ch = 1.42;
  tests.forEach(([n, t, d, c], i) => {
    const x = M + (i % 3) * (cw + 0.3);
    const y = 1.62 + Math.floor(i / 3) * (ch + 0.24);
    card(s, x, y, cw, ch);
    chip(s, x + 0.26, y + 0.26, n, c, 0.34);
    s.addText(t, { x: x + 0.26, y: y + 0.72, w: cw - 0.52, h: 0.3, fontSize: 12.5, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(d, { x: x + 0.26, y: y + 1.02, w: cw - 0.52, h: 0.34, fontSize: 10, color: BODY, fontFace: F, margin: 0, lineSpacing: 12, valign: "top" });
  });
  s.addText("Run them in order — each test assumes the previous one passed.", {
    x: M, y: 6.62, w: W, h: 0.3, fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top",
  });
  s.addNotes("Tests 1-4 are plumbing, 5-8 automation, 9 fleet execution. Test 7 is the one that must pass before production.");
}

/* ============================ 4. Test 1 ============================ */
testSlide("Test 1", "Connectivity & authorisation",
  [
    "Settings → Integrations → add a KOI instance.",
    ["Server URL:  https://api.prod.koi.security/", "code"],
    "Paste the API key, then click Test.",
    ["!koi-devices-list limit=5", "code"],
    ["!koi-users-list limit=1", "code"],
  ],
  [
    "Test returns Success.",
    "A device table with up to five rows.",
    "koi-users-list returns a user record.",
    "No 403 Forbidden on either command.",
  ],
  "koi-users-list is the egress probe. A valid key can still return 403 from a shared cloud egress — if it does, run the integration on a Cortex engine whose egress IP KOI accepts. Event collection is unaffected either way."
).addNotes("If Test succeeds but koi-users-list returns 403, the key is fine and the source IP is the problem.");

/* ============================ 5. Test 2 ============================ */
testSlide("Test 2", "Event collection",
  [
    "On the instance, enable Fetch events and save.",
    "Wait for one or two fetch cycles.",
    ["dataset = koi_koi_raw", "code"],
    ["| comp count() as events by source_log_type", "code"],
    "Re-run the query after the next cycle.",
    ["!koi-fetch-context-get", "code"],
  ],
  [
    "Rows for the Alerts and Audit log types.",
    "Counts increase between the two runs.",
    "koi-fetch-context-get shows the cursor.",
  ],
  "Event collection uses a different KOI endpoint from the command surface, so it keeps working even when the sensitive endpoints return 403. A passing test 2 alongside a failing test 1 points squarely at egress."
).addNotes("Give it two cycles before judging. A single cycle with no new KOI activity legitimately returns nothing.");

/* ============================ 6. Test 3 ============================ */
testSlide("Test 3", "Command surface",
  [
    "Sweep the read commands in the playground:",
    ["!koi-inventory-list limit=5", "code"],
    ["!koi-koidex-search query=<package>", "code"],
    ["!koi-blocklist-get", "code"],
    ["!koi-policy-list", "code"],
    ["!koi-findings-list", "code"],
    "Take a device id from test 1 and run:",
    ["!koi-device-inventory-get device_id=<id>", "code"],
  ],
  [
    "Each returns a table plus context under Koi.*",
    "No 403 on any of them.",
    "Lists everything installed on that host.",
    "500 items on one host, 35 flagged high risk.",
  ],
  "Twenty of the twenty-six commands are read-only. Only six change tenant state: the allowlist and blocklist add/remove pairs, koi-policy-status-update and koi-fetch-context-set. None of them run in this test."
).addNotes("This is the test that most often exposes the egress problem, because it hits the sensitive endpoints hardest.");

/* ============================ 7. Test 4 ============================ */
testSlide("Test 4", "Dashboard & data model",
  [
    "Dashboards & Reports → open Koi Alerts Dashboard.",
    "Set the time range to cover your ingested data.",
    "Confirm each widget renders.",
    "Then check the modelling with XQL:",
    ["dataset = koi_koi_raw | fields xdm.*", "code"],
  ],
  [
    "Widgets render with data, not empty states.",
    "XDM fields are populated, not null.",
    "Alert activity matches what KOI shows.",
  ],
  "An empty dashboard with a passing test 2 usually means the time range, not the data. Widen it before investigating the rules."
).addNotes("The parsing and modeling rules are user-defined and target koi_koi_raw.");

/* ============================ 8. Test 5 ============================ */
testSlide("Test 5", "Alert triage, end to end",
  [
    "Open an ingested KOI alert (source koi).",
    "Attach and run KOI - Alert Triage.",
    "Watch the Work Plan to completion.",
    "Read the war room from top to bottom.",
  ],
  [
    "Work Plan completes — runStatus: completed.",
    "An item investigation summary is posted.",
    "A device investigation summary is posted.",
    "A triage summary carries a verdict.",
    "Benign auto-closes, Suspicious stays open, Malicious raises severity.",
  ],
  "Reference run: a vulnerable-dependency alert on a package whose KOI catalog risk is High escalated to Malicious — driven by the independent catalog data, not the alert's own severity. That corroboration is the point of the verdict logic."
).addNotes("If the playbook cannot find the item, the alert may map the KOI payload to a field other than incident.details — adjust the alert_description input on KOI - Extract Alert Context.");

/* ============================ 9. Test 6 ============================ */
testSlide("Test 6", "The two investigations",
  [
    "In the test 5 run, open the item investigation summary.",
    "Open the device investigation summary and its risky-items table.",
    "Optionally run the device investigation on its own:",
    ["KOI - Investigate Device, device_id=<id>", "code"],
  ],
  [
    "Item: catalog risk and AI summary, org exposure, endpoints and users, blocklist state, remediation and approval history.",
    "Device: everything installed on the host, which of it is risky, host remediations.",
  ],
  "Known cosmetic issue: a few item-investigation fields render with array brackets — [\"high\"] rather than high — because XSOAR resolves arrays differently inside a sub-playbook. The values are correct and the analyst-facing triage summary renders clean."
).addNotes("Both investigations are best-effort: if KOI is unreachable the playbook still completes, it just has less to show.");

/* ============================ 10. Test 7 ============================ */
{
  const s = testSlide("Test 7  ·  safety-critical", "Response stays gated on a human",
    [
      "Let a Malicious verdict reach the response step, or run it directly:",
      ["KOI - Block and Remediate", "code"],
      ["item_id=<id>  marketplace=<mp>  auto_block=false", "code"],
      "Do not approve yet.",
      "Inspect the run state and the war room.",
      "Then approve, and re-inspect.",
    ],
    [
      "The run parks — runStatus: waiting.",
      "koi-blocklist-items-add has NOT executed.",
      "The approval shows the full investigation.",
      "An already-blocklisted item short-circuits as Already blocked.",
      "Only then does the blocklist write fire.",
    ],
    "This is the one test that must pass before you use the pack in production. Triage always calls the response playbook with auto_block=false, so a Malicious verdict can never block software on its own."
  );
  s.addNotes("The blocklist add is the only state-changing command the automation can reach. Verify it did not run before approval — check the war room command history, not just the playbook view.");
}

/* ============================ 11. Test 8 ============================ */
testSlide("Test 8", "Scheduled hunt for risky MCP servers",
  [
    "Run KOI - MCP Server Audit manually first.",
    "Leave risk_levels at its default:",
    ["high,critical", "code"],
    "Review what it flags.",
    "Then attach it to a time-triggered Job.",
  ],
  [
    "MCP-server inventory is enumerated.",
    "Items at or above the threshold are flagged and reported.",
    "Runs on your schedule with no alert needed.",
  ],
  "The audit queries koi-inventory-list with view=mcp_servers. Confirm that view matches how your tenant categorises MCP servers — if it returns nothing, check the categorisation before assuming the estate is clean."
).addNotes("This is the proactive half of the pack: it finds risky agentic-AI assets without waiting for KOI to raise an alert.");

/* ============================ 12. Test 9 ============================ */
testSlide("Test 9", "Script Runner job",
  [
    "Confirm the prerequisites exist and match by name.",
    "Create the JSON List named exactly:",
    ["Koi Script Runner", "code"],
    "Automation → Jobs → Run now.",
    "Open the run, then open Action Center.",
  ],
  [
    "Work Plan is green.",
    "ScriptResult ok:true plus an action_id.",
    "SKIPPED info entries where no connected endpoint matches the OS scope — and no failure email.",
    "Action Center shows COMPLETED_SUCCESSFULLY.",
  ],
  "Every binding on the 'Names that must match exactly' slide applies here. The war room records which reference broke, and a SKIPPED entry is not a failure — it means no connected, unisolated endpoint currently matches that OS scope."
).addNotes("Three outcomes are by design: ok, skipped (valid entry, nothing to run on right now) and failed. Skipped is not a failure and deliberately sends no email.");

/* ============================ 13. Troubleshooting ============================ */
{
  const s = newSlide();
  heading(s, "If something fails", "Symptom → cause → fix");
  const rows = [
    ["403 on inventory, koidex or users", "Source IP not accepted by KOI's edge", "Run the integration on a Cortex engine with an allowlisted egress IP"],
    ["Test passes but no events arrive", "Fetch events not enabled, or no new KOI activity", "Enable it, wait two cycles, check koi-fetch-context-get"],
    ["Triage cannot find the item", "The alert maps the KOI payload elsewhere", "Adjust alert_description on KOI - Extract Alert Context"],
    ["Enrichment empty, playbook still green", "Best-effort by design — KOI was unreachable", "Verify with !koi-users-list limit=1"],
    ["Job entry reports SKIPPED", "No connected, unisolated endpoint matches the OS scope", "Check group membership and endpoint_os in the List"],
    ["Script not found at dispatch", "Library name does not match script.name exactly", "Fix the name, or pin script.uuid to be rename-proof"],
  ];
  const y0 = 1.66, rh = 0.60;                    // every cell is one line — hug it
  rows.forEach(([sym, cause, fix], i) => {
    const y = y0 + i * (rh + 0.14);
    card(s, M, y, W, rh);
    s.addText(sym, { x: M + 0.3, y: y + 0.17, w: 3.5, h: 0.3, fontSize: 11.5, bold: true, color: WHITE, fontFace: F, margin: 0, valign: "top" });
    s.addText(cause, { x: M + 4.0, y: y + 0.18, w: 3.6, h: 0.3, fontSize: 10.5, color: AMBER, fontFace: F, margin: 0, valign: "top" });
    s.addText(fix, { x: M + 7.8, y: y + 0.18, w: W - 8.1, h: 0.3, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, valign: "top" });
  });
  s.addText("The first row accounts for most real-world failures — check egress before anything else.", {
    x: M, y: y0 + 6 * (rh + 0.14) + 0.18, w: W, h: 0.3,
    fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0, valign: "top",
  });
  s.addNotes("Almost every real-world failure is one of these six. The first is by far the most common.");
}

/* ============================ 14. Sign-off ============================ */
{
  const s = newSlide();
  // kept above the card grid (bottom at 1.4in vs the first row at 1.66) — at its
  // previous size the arc showed through the gaps between the right-hand cards
  s.addShape(pres.ShapeType.ellipse, {
    x: 11.4, y: -3.4, w: 4.8, h: 4.8,
    fill: { color: GREEN, transparency: 93 }, line: { color: GREEN, width: 1 },
  });
  heading(s, "Sign-off", "One line of evidence per test");
  const checks = [
    ["1", "Test returns Success and koi-devices-list returns rows"],
    ["2", "koi_koi_raw event counts grow between fetch cycles"],
    ["3", "Read commands return tenant data with no 403"],
    ["4", "Dashboard widgets render and XDM fields are populated"],
    ["5", "Triage completes with a verdict and both summaries"],
    ["6", "Item and device investigations carry real KOI data"],
    ["7", "Run parks on approval; blocklist write did not execute"],
    ["8", "MCP audit flags items at or above the threshold"],
    ["9", "Job returns ScriptResult ok with an action_id"],
  ];
  const cw = (W - 0.4) / 2;
  checks.forEach(([n, t], i) => {
    const col = i < 5 ? 0 : 1;
    const row = i < 5 ? i : i - 5;
    const x = M + col * (cw + 0.4);
    const y = 1.72 + row * 0.78;
    card(s, x, y, cw, 0.64);
    chip(s, x + 0.22, y + 0.14, n, GREEN, 0.36);
    s.addText(t, { x: x + 0.76, y: y + 0.15, w: cw - 1.0, h: 0.4, fontSize: 11, color: BODY, fontFace: F, margin: 0, lineSpacing: 13, valign: "top" });
  });
  card(s, M + cw + 0.4, 1.72 + 4 * 0.78, cw, 0.64, CARD_HI);
  s.addText("All nine green → the pack is ready for production use.", {
    x: M + cw + 0.62, y: 1.72 + 4 * 0.78 + 0.16, w: cw - 0.44, h: 0.4,
    fontSize: 11, bold: true, italic: true, color: GREEN, fontFace: F, margin: 0, valign: "top",
  });
  s.addText("Full detail for every step is in the customer guide — KOI_Integration_Customer_Guide_v1.3.0 (Word and PDF).", {
    x: M, y: 6.35, w: W, h: 0.3, fontSize: 11, color: MUTED, fontFace: F, margin: 0, valign: "top",
  });
  s.addNotes("Test 7 is the gate. The other eight can be re-run any time; test 7 should be re-run after any change to the response playbook.");
}

const out = path.join(__dirname, "KOI_Content_Pack_Test_Guide.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("written", out));
