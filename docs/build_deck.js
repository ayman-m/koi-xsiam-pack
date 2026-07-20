/* Build "KOI Content Pack — Overview" (.pptx)
   Dark deck: black slides, orange/cyan accents, chip + card motif. No animation.
   Run:  NODE_PATH=<dir with pptxgenjs> node build_deck.js                      */
const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.3 x 7.5 in — must be set before adding slides
pres.author = "Cortex XSOAR";
pres.title = "KOI Content Pack — Overview";

/* ---------- palette ---------- */
const BG = "000000";
const CARD = "15171B";
const CARD_HI = "1C2026";
const ORANGE = "E8551F";
const CYAN = "22D3EE";
const WHITE = "FFFFFF";
const BODY = "B4B7BD";
const MUTED = "6E747E";
const F = "Calibri";
const MONO = "Courier New";

/* ---------- geometry ---------- */
const M = 0.6;                 // slide margin
const W = 13.3 - M * 2;        // usable width = 12.1

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
      color: ORANGE, fontFace: F, charSpacing: 2, margin: 0,
    });
  s.addText(title, {
    x: M, y: 0.70, w: W, h: 0.75, fontSize: 33, bold: true,
    color: WHITE, fontFace: F, margin: 0,
  });
};

const arrow = (s, x, y) =>
  s.addShape(pres.ShapeType.rightArrow, {
    x, y, w: 0.30, h: 0.20, fill: { color: ORANGE }, line: { color: ORANGE, width: 0 },
  });

/* flow box */
const flowBox = (s, x, y, w, h, title, sub, accent = ORANGE) => {
  card(s, x, y, w, h, CARD);
  s.addText(title, {
    x: x + 0.18, y: y + 0.16, w: w - 0.36, h: 0.34,
    fontSize: 13, bold: true, color: WHITE, fontFace: F, margin: 0,
  });
  if (sub)
    s.addText(sub, {
      x: x + 0.18, y: y + 0.52, w: w - 0.36, h: h - 0.68,
      fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 14,
    });
  s.addShape(pres.ShapeType.roundRect, {
    x: x + 0.18, y: y + h - 0.28, w: 0.5, h: 0.06,
    fill: { color: accent }, line: { color: accent, width: 0 }, rectRadius: 0.03,
  });
};

/* ============================ 1. Title ============================ */
{
  const s = newSlide();
  // soft accent glow (decorative, not a stripe)
  s.addShape(pres.ShapeType.ellipse, {
    x: 9.1, y: -1.5, w: 6.2, h: 6.2,
    fill: { color: ORANGE, transparency: 92 }, line: { color: ORANGE, width: 1 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.6, y: 3.4, w: 3.6, h: 3.6,
    fill: { color: CYAN, transparency: 94 }, line: { color: CYAN, width: 1 },
  });
  s.addText("CORTEX XSIAM  ·  CORTEX XSOAR  ·  CONTENT PACK", {
    x: M, y: 1.75, w: W, h: 0.3, fontSize: 12, bold: true,
    color: ORANGE, fontFace: F, charSpacing: 3, margin: 0,
  });
  s.addText("KOI", {
    x: M, y: 1.98, w: 7.5, h: 1.80, fontSize: 96, bold: true,
    color: WHITE, fontFace: F, margin: 0,
  });
  s.addText("Endpoint and agentic-AI security — collected, investigated and acted on, automatically.", {
    x: M, y: 3.86, w: 8.2, h: 0.9, fontSize: 17, color: BODY, fontFace: F,
    margin: 0, lineSpacing: 24,
  });
  const stats = [["26", "commands"], ["10", "playbooks"], ["1", "dashboard"], ["2", "rule sets"]];
  stats.forEach(([n, l], i) => {
    const x = M + i * 2.05;
    s.addText(n, { x, y: 5.05, w: 1.7, h: 0.6, fontSize: 36, bold: true, color: ORANGE, fontFace: F, margin: 0 });
    s.addText(l, { x, y: 5.65, w: 1.7, h: 0.3, fontSize: 11, color: MUTED, fontFace: F, margin: 0 });
  });
  s.addNotes("KOI content pack overview. Covers what ships in the pack, its capabilities, the automated triage and investigation flow, analyst-gated response, deployment and validation.");
}

/* ============================ 2. The surface ============================ */
{
  const s = newSlide();
  heading(s, "The problem", "The software you never deployed — but still run");
  s.addText("KOI discovers, scores and governs the long tail of software your workforce installs itself, including the fast-growing agentic-AI surface.", {
    x: M, y: 1.48, w: 9.6, h: 0.4, fontSize: 12.5, color: BODY, fontFace: F, margin: 0,
  });
  const items = [
    ["1", "Browser extensions", "Chrome, Edge and friends — the classic blind spot."],
    ["2", "IDE plugins", "VS Code and JetBrains add-ons running with developer rights."],
    ["3", "Code packages", "npm and PyPI dependencies pulled straight into builds."],
    ["4", "Desktop applications", "Installed outside any deployment pipeline."],
    ["5", "MCP servers", "Model Context Protocol endpoints wired into AI agents."],
    ["6", "AI models & skills", "The rest of the agentic-AI supply chain."],
  ];
  const cw = (W - 0.7) / 3, ch = 1.95;
  items.forEach(([n, t, d], i) => {
    const x = M + (i % 3) * (cw + 0.35);
    const y = 2.05 + Math.floor(i / 3) * (ch + 0.35);
    card(s, x, y, cw, ch);
    chip(s, x + 0.28, y + 0.28, n, i > 3 ? CYAN : ORANGE);
    s.addText(t, { x: x + 0.28, y: y + 0.76, w: cw - 0.56, h: 0.34, fontSize: 14.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.28, y: y + 1.12, w: cw - 0.56, h: 0.66, fontSize: 11, color: BODY, fontFace: F, margin: 0, lineSpacing: 14 });
  });
  s.addNotes("The pack targets self-installed software and the agentic-AI supply chain — the assets traditional endpoint tooling does not inventory.");
}

/* ============================ 3. What's in the pack ============================ */
{
  const s = newSlide();
  heading(s, "Contents", "What ships in the pack");
  const rows = [
    ["A", "KOI integration", "Event collector plus 26 commands across the KOI API."],
    ["B", "Parsing & modeling rules", "Normalize raw events and map them to the Cortex Data Model."],
    ["C", "Alerts dashboard", "Ready-made XSIAM dashboard for KOI alert activity."],
    ["D", "Triage & response playbooks", "Seven playbooks: triage, investigation, and gated response."],
    ["E", "Script Runner playbooks", "Three playbooks to run KOI scripts on Cortex-Agent endpoints."],
  ];
  const lw = 7.4;
  rows.forEach(([g, t, d], i) => {
    const y = 1.72 + i * 1.03;
    card(s, M, y, lw, 0.88);
    chip(s, M + 0.26, y + 0.26, g, i === 3 ? CYAN : ORANGE);
    s.addText(t, { x: M + 0.86, y: y + 0.14, w: lw - 1.1, h: 0.32, fontSize: 14, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(d, { x: M + 0.86, y: y + 0.46, w: lw - 1.1, h: 0.3, fontSize: 10.5, color: BODY, fontFace: F, margin: 0 });
  });
  // right panel
  const px = M + lw + 0.4, pw = W - lw - 0.4;
  card(s, px, 1.72, pw, 5.15, CARD_HI);
  s.addText("Two independent automation tracks", {
    x: px + 0.3, y: 1.98, w: pw - 0.6, h: 0.6, fontSize: 15, bold: true, color: WHITE, fontFace: F, margin: 0, lineSpacing: 20,
  });
  s.addText(
    [
      { text: "Detect & respond", options: { bold: true, color: ORANGE, fontSize: 12.5, breakLine: true } },
      { text: "Each KOI alert is triaged, investigated and routed — with response gated on an analyst.", options: { color: BODY, fontSize: 11, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: "Operate at fleet scale", options: { bold: true, color: CYAN, fontSize: 12.5, breakLine: true } },
      { text: "Run KOI script packages on Cortex-Agent endpoints on a schedule, targeted by OS, group or hostname.", options: { color: BODY, fontSize: 11 } },
    ],
    { x: px + 0.3, y: 2.7, w: pw - 0.6, h: 2.6, fontFace: F, margin: 0, lineSpacing: 15 }
  );
  s.addText("Everything installs together as one pack.", {
    x: px + 0.3, y: 6.2, w: pw - 0.6, h: 0.4, fontSize: 10.5, italic: true, color: MUTED, fontFace: F, margin: 0,
  });
  s.addNotes("Five component groups. The two playbook suites solve different problems: alert-driven response, and scheduled fleet execution.");
}

/* ============================ 4. Capabilities ============================ */
{
  const s = newSlide();
  heading(s, "Capabilities", "What you can do with it");
  const caps = [
    ["Telemetry collection", "Alerts and audit logs into koi_koi_raw, mapped to XDM."],
    ["Asset & posture visibility", "Everything running, per item or per device, with risk scoring."],
    ["Threat intelligence", "Koidex risk score, findings and an AI-generated risk summary."],
    ["Automated triage", "Benign / Suspicious / Malicious on every alert, with routing."],
    ["Deep investigation", "Item exposure and device posture gathered automatically."],
    ["Analyst-gated response", "Org-wide blocklisting only after a human approves."],
    ["Proactive hunting", "Scheduled MCP-server audit across the estate."],
    ["Fleet script execution", "Scheduled KOI script runs on Cortex-Agent endpoints."],
  ];
  const cw = (W - 0.4) / 2, ch = 1.12;
  caps.forEach(([t, d], i) => {
    const x = M + (i % 2) * (cw + 0.4);
    const y = 1.66 + Math.floor(i / 2) * (ch + 0.17);
    card(s, x, y, cw, ch);
    chip(s, x + 0.24, y + 0.36, String(i + 1), i % 2 ? CYAN : ORANGE, 0.34);
    s.addText(t, { x: x + 0.78, y: y + 0.20, w: cw - 1.0, h: 0.34, fontSize: 13.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.78, y: y + 0.55, w: cw - 1.0, h: 0.42, fontSize: 10.5, color: BODY, fontFace: F, margin: 0 });
  });
  s.addNotes("Eight capabilities spanning visibility, intelligence, automated triage, investigation, gated response and fleet operations.");
}

/* ============================ 5. Architecture ============================ */
{
  const s = newSlide();
  heading(s, "Architecture", "How it flows");
  const bw = 2.18, by = 1.95, bh = 1.5;
  const boxes = [
    ["KOI API", "Alerts, audit,\ninventory, Koidex"],
    ["Integration", "Runs on tenant\nor a Cortex engine"],
    ["koi_koi_raw", "Raw events\nland here"],
    ["Parsing + modeling", "Normalized and\nmapped to XDM"],
    ["Dashboard & XQL", "Hunt, visualize,\ncorrelate"],
  ];
  boxes.forEach(([t, d], i) => {
    const x = M + i * (bw + 0.29);
    flowBox(s, x, by, bw, bh, t, d, i === 1 ? CYAN : ORANGE);
    if (i < boxes.length - 1) arrow(s, x + bw + 0.00, by + bh / 2 - 0.10);
  });
  // second track
  s.addText("Alert-driven automation", {
    x: M, y: 3.75, w: W, h: 0.32, fontSize: 12, bold: true, color: ORANGE, fontFace: F, charSpacing: 1, margin: 0,
  });
  const t2 = [
    ["KOI alert", "Ingested into Cortex"],
    ["Triage playbook", "Investigate + classify"],
    ["Verdict", "Auto-close or escalate"],
    ["Gated response", "Block only on approval"],
  ];
  const b2w = 2.78;
  t2.forEach(([t, d], i) => {
    const x = M + i * (b2w + 0.32);
    flowBox(s, x, 4.15, b2w, 1.3, t, d, i === 3 ? CYAN : ORANGE);
    if (i < t2.length - 1) arrow(s, x + b2w + 0.01, 4.15 + 0.55);
  });
  // egress callout
  card(s, M, 5.75, W, 1.05, CARD_HI);
  chip(s, M + 0.28, 6.03, "!", ORANGE, 0.36);
  s.addText("Egress matters", { x: M + 0.86, y: 5.92, w: 3.0, h: 0.3, fontSize: 12.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
  s.addText("KOI restricts its sensitive endpoints by source IP. A valid key can still return 403 from a shared cloud egress — run the integration on a Cortex engine whose egress IP KOI accepts. Event collection is unaffected.", {
    x: M + 0.86, y: 6.22, w: W - 1.2, h: 0.5, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13,
  });
  s.addNotes("Two tracks: telemetry into the data model, and alert-driven automation. The egress caveat is the single most common cause of 403s on the command surface.");
}

/* ============================ 6. Triage ============================ */
{
  const s = newSlide();
  heading(s, "Automated triage", "Every alert, investigated before it reaches a human");
  const steps = [
    ["Extract context", "Parse the embedded\nkoi_context payload"],
    ["Investigate item", "Catalog risk, exposure,\ngovernance, history"],
    ["Investigate device", "Everything on the host,\nand what is risky"],
    ["Verdict", "Classify from KOI +\nindependent catalog risk"],
  ];
  const bw = 2.83;
  steps.forEach(([t, d], i) => {
    const x = M + i * (bw + 0.33);
    flowBox(s, x, 1.72, bw, 1.55, t, d, i === 2 ? CYAN : ORANGE);
    if (i < steps.length - 1) arrow(s, x + bw + 0.02, 1.72 + 0.68);
  });
  const verdicts = [
    ["Malicious", ORANGE, "Removed from marketplace, publisher compromised, unvetted MCP server, High/Critical risk, or high catalog risk.", "Raise severity, then open an analyst-gated block."],
    ["Suspicious", "F5A524", "Anything that is not clearly benign — the safe default.", "Left open for analyst review."],
    ["Benign", "3FB950", "A newly observed item whose KOI risk level is Low.", "Auto-closed as Resolved."],
  ];
  const vw = (W - 0.7) / 3;
  verdicts.forEach(([t, c, cond, act], i) => {
    const x = M + i * (vw + 0.35);
    card(s, x, 3.62, vw, 2.72);
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.28, y: 3.9, w: 1.42, h: 0.34, fill: { color: c }, line: { color: c, width: 0 }, rectRadius: 0.08,
    });
    s.addText(t, { x: x + 0.28, y: 3.9, w: 1.42, h: 0.34, align: "center", valign: "middle", fontSize: 11.5, bold: true, color: "000000", fontFace: F, margin: 0 });
    s.addText(cond, { x: x + 0.28, y: 4.42, w: vw - 0.56, h: 1.1, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13 });
    s.addText(act, { x: x + 0.28, y: 5.6, w: vw - 0.56, h: 0.6, fontSize: 10.5, bold: true, color: WHITE, fontFace: F, margin: 0, lineSpacing: 13 });
  });
  s.addNotes("Verdict is keyed on KOI's own alert type and risk level, corroborated by the independent Koidex catalog risk — so a benign-looking alert on a high-risk package still escalates.");
}

/* ============================ 7. Investigation depth ============================ */
{
  const s = newSlide();
  heading(s, "Investigation", "Two investigations, run automatically");
  const cw = (W - 0.45) / 2;
  const panels = [
    ["Item investigation", ORANGE, "What is this thing, and where is it?", [
      "Catalog risk score, level and AI-generated risk summary",
      "Organization exposure — installs, publisher, signing status",
      "The endpoints it is installed on, and the users affected",
      "Governance state — is it already on the blocklist?",
      "Remediation and prior-approval history for the item",
    ]],
    ["Device investigation", CYAN, "What else is on the affected host?", [
      "Every item installed on the device, with version and path",
      "Which of those sit at or above your risk threshold",
      "Marketplace, publisher and install location per item",
      "Remediations recorded against that host",
      "Turns a single alert into full host posture",
    ]],
  ];
  panels.forEach(([t, c, sub, list], i) => {
    const x = M + i * (cw + 0.45);
    card(s, x, 1.66, cw, 5.15);
    chip(s, x + 0.32, 1.98, i === 0 ? "I" : "D", c);
    s.addText(t, { x: x + 0.92, y: 1.96, w: cw - 1.2, h: 0.36, fontSize: 17, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(sub, { x: x + 0.32, y: 2.52, w: cw - 0.64, h: 0.34, fontSize: 11.5, italic: true, color: c, fontFace: F, margin: 0 });
    s.addText(
      list.map((li, k) => ({ text: li, options: { bullet: true, breakLine: k < list.length - 1 } })),
      { x: x + 0.34, y: 3.0, w: cw - 0.68, h: 3.5, fontSize: 11.5, color: BODY, fontFace: F, margin: 0, paraSpaceAfter: 10, lineSpacing: 15 }
    );
  });
  s.addNotes("The item investigation answers what and where; the device investigation answers what else is on that host. Together they give the analyst the full picture before any decision.");
}

/* ============================ 8. Gated response ============================ */
{
  const s = newSlide();
  heading(s, "Response", "Action, gated on a human");
  const steps = [
    ["Malicious verdict", "Severity raised"],
    ["Full investigation", "Exposure + governance"],
    ["Already blocked?", "Skip if redundant"],
    ["Analyst approval", "Playbook waits here"],
    ["Blocklist write", "Org-wide, on approval"],
  ];
  const bw = 2.18;
  steps.forEach(([t, d], i) => {
    const x = M + i * (bw + 0.29);
    flowBox(s, x, 1.78, bw, 1.5, t, d, i === 3 ? CYAN : ORANGE);
    if (i < steps.length - 1) arrow(s, x + bw + 0.00, 1.78 + 0.65);
  });
  card(s, M, 3.72, W, 1.55, CARD_HI);
  s.addText("0", { x: M + 0.4, y: 3.9, w: 1.5, h: 1.1, fontSize: 62, bold: true, color: ORANGE, fontFace: F, margin: 0 });
  s.addText("org-wide blocks without an explicit analyst approval", {
    x: M + 1.95, y: 4.05, w: W - 2.4, h: 0.4, fontSize: 15, bold: true, color: WHITE, fontFace: F, margin: 0,
  });
  s.addText("Triage always invokes the response playbook with auto_block = false. On a Malicious verdict the run parks on the approval task; the blocklist command does not execute until a human approves. Verified on a live tenant.", {
    x: M + 1.95, y: 4.45, w: W - 2.4, h: 0.7, fontSize: 11, color: BODY, fontFace: F, margin: 0, lineSpacing: 14,
  });
  const notes = [
    ["Safe by default", "The only state-changing command in the set is gated."],
    ["No redundant blocks", "Items already on the blocklist short-circuit."],
    ["Full context at the gate", "The approval shows risk, exposure and history."],
  ];
  const nw = (W - 0.7) / 3;
  notes.forEach(([t, d], i) => {
    const x = M + i * (nw + 0.35);
    card(s, x, 5.5, nw, 1.32);
    s.addText(t, { x: x + 0.26, y: 5.7, w: nw - 0.52, h: 0.32, fontSize: 12.5, bold: true, color: CYAN, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.26, y: 6.04, w: nw - 0.52, h: 0.62, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13 });
  });
  s.addNotes("The safety property: the blocklist write never fires before approval. This was verified end to end on a live tenant.");
}

/* ============================ 9. Command surface ============================ */
{
  const s = newSlide();
  heading(s, "API surface", "26 commands across the KOI platform");
  const groups = [
    ["7", "Governance & policies", "Policies, runtime hardening, findings, approvals, remediations"],
    ["6", "Allowlist & blocklist", "Read and modify organization-wide allow and block lists"],
    ["4", "Devices & organization", "Devices, per-device inventory, groups and users"],
    ["4", "Inventory", "Items, item detail, search, and per-item endpoint exposure"],
    ["3", "Collector & diagnostics", "Manual event pulls and fetch-state inspection"],
    ["2", "Koidex catalog", "Catalog search and full item risk reports"],
  ];
  const cw = (W - 0.7) / 3, ch = 1.95;
  groups.forEach(([n, t, d], i) => {
    const x = M + (i % 3) * (cw + 0.35);
    const y = 1.85 + Math.floor(i / 3) * (ch + 0.35);
    card(s, x, y, cw, ch);
    s.addText(n, { x: x + 0.28, y: y + 0.2, w: 1.2, h: 0.72, fontSize: 40, bold: true, color: i % 2 ? CYAN : ORANGE, fontFace: F, margin: 0 });
    s.addText(t, { x: x + 0.28, y: y + 0.95, w: cw - 0.56, h: 0.34, fontSize: 13.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.28, y: y + 1.3, w: cw - 0.56, h: 0.55, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13 });
  });
  s.addText("Read-only by default — only the allow/block list and policy-status commands change tenant state.", {
    x: M, y: 6.35, w: W, h: 0.35, fontSize: 11, italic: true, color: MUTED, fontFace: F, margin: 0,
  });
  s.addNotes("26 commands. Most are read-only; the state-changing ones are the allow/block list writes and policy status updates.");
}

/* ============================ 10. Deployment ============================ */
{
  const s = newSlide();
  heading(s, "Deployment", "Getting it running");
  const cols = [
    ["1", "Marketplace", ORANGE, ["Search for KOI and install", "Integration, rules and dashboard land together", "Recommended for production tenants"]],
    ["2", "Pack zip", CYAN, ["Build with demisto-sdk zip-packs", "Upload as a single object", "Best for dev/test and CI pipelines"]],
    ["3", "Manual items", ORANGE, ["Import individual playbooks and rules", "Import sub-playbooks before their callers", "Keep item names unchanged"]],
  ];
  const cw = (W - 0.7) / 3;
  cols.forEach(([n, t, c, list], i) => {
    const x = M + i * (cw + 0.35);
    card(s, x, 1.7, cw, 3.35);
    chip(s, x + 0.3, 1.98, n, c);
    s.addText(t, { x: x + 0.9, y: 1.96, w: cw - 1.2, h: 0.36, fontSize: 16, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(
      list.map((li, k) => ({ text: li, options: { bullet: true, breakLine: k < list.length - 1 } })),
      { x: x + 0.32, y: 2.52, w: cw - 0.64, h: 2.3, fontSize: 11, color: BODY, fontFace: F, margin: 0, paraSpaceAfter: 9, lineSpacing: 14 }
    );
  });
  card(s, M, 5.25, W, 1.55, CARD_HI);
  s.addText("Then prove it works", { x: M + 0.32, y: 5.42, w: 4.0, h: 0.32, fontSize: 13, bold: true, color: WHITE, fontFace: F, margin: 0 });
  s.addText(
    [
      { text: "!koi-devices-list limit=5", options: { fontFace: MONO, color: CYAN, fontSize: 11, breakLine: true } },
      { text: "dataset = koi_koi_raw | comp count() as events by source_log_type", options: { fontFace: MONO, color: CYAN, fontSize: 11, breakLine: true } },
      { text: "Attach KOI - Alert Triage to a KOI alert and confirm the investigation summaries and verdict appear in the war room.", options: { color: BODY, fontSize: 11 } },
    ],
    { x: M + 0.32, y: 5.78, w: W - 0.64, h: 0.95, fontFace: F, margin: 0, lineSpacing: 15 }
  );
  s.addNotes("Three install paths. Validation: connectivity, collector, and a triage run end to end.");
}

/* ============================ 11. Proven ============================ */
{
  const s = newSlide();
  heading(s, "Validation", "Proven on a live tenant");
  const stats = [
    ["11/11", "read commands returned live data — zero 403s once egress was correct", ORANGE],
    ["500", "items inventoried on a single host, 35 of them flagged high risk", CYAN],
    ["3", "playbook stages per alert — extract, item and device investigation", ORANGE],
    ["0", "blocklist writes fired before an analyst approved", CYAN],
  ];
  const cw = (W - 0.9) / 4;
  stats.forEach(([n, d, c], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 1.9, cw, 2.5);
    s.addText(n, { x: x + 0.26, y: 2.16, w: cw - 0.52, h: 0.9, fontSize: 46, bold: true, color: c, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.26, y: 3.12, w: cw - 0.52, h: 1.1, fontSize: 11, color: BODY, fontFace: F, margin: 0, lineSpacing: 14 });
  });
  card(s, M, 4.65, W, 2.15, CARD_HI);
  s.addText("End-to-end run on a real alert", { x: M + 0.34, y: 4.85, w: 6.0, h: 0.34, fontSize: 14, bold: true, color: WHITE, fontFace: F, margin: 0 });
  s.addText(
    [
      { text: "A vulnerable-dependency alert on a package whose catalog risk is High was escalated to ", options: { color: BODY, fontSize: 11.5 } },
      { text: "Malicious", options: { color: ORANGE, bold: true, fontSize: 11.5 } },
      { text: " — driven by real KOI catalog data, not the alert's own severity. The run then opened an analyst-gated block and parked on the approval task, with the blocklist command unexecuted.", options: { color: BODY, fontSize: 11.5, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: "Both investigations posted their summaries to the war room; the playbook completed cleanly.", options: { color: MUTED, fontSize: 11, italic: true } },
    ],
    { x: M + 0.34, y: 5.25, w: W - 0.68, h: 1.35, fontFace: F, margin: 0, lineSpacing: 16 }
  );
  s.addNotes("These are measured results from a live tenant run, not projections.");
}

/* ============================ 12. Close ============================ */
{
  const s = newSlide();
  s.addShape(pres.ShapeType.ellipse, {
    x: -1.8, y: 3.6, w: 5.6, h: 5.6,
    fill: { color: ORANGE, transparency: 92 }, line: { color: ORANGE, width: 1 },
  });
  s.addText("WHERE TO GO NEXT", {
    x: M, y: 1.7, w: W, h: 0.3, fontSize: 12, bold: true, color: ORANGE, fontFace: F, charSpacing: 3, margin: 0,
  });
  s.addText("Install it, point it at KOI, attach the triage.", {
    x: M, y: 2.05, w: 9.4, h: 1.70, fontSize: 38, bold: true, color: WHITE, fontFace: F, margin: 0, lineSpacing: 44,
  });
  const links = [
    ["Customer guide", "Install, configure, all 26 commands, playbooks, validation and troubleshooting — Word and PDF."],
    ["Playbooks reference", "Architecture and configuration for both playbook suites."],
    ["Pack repository", "Source for the integration, rules, dashboard and playbooks."],
  ];
  const cw = (W - 0.7) / 3;
  links.forEach(([t, d], i) => {
    const x = M + i * (cw + 0.35);
    card(s, x, 3.85, cw, 1.85);
    chip(s, x + 0.28, 4.1, String(i + 1), i === 1 ? CYAN : ORANGE);
    s.addText(t, { x: x + 0.28, y: 4.58, w: cw - 0.56, h: 0.32, fontSize: 13.5, bold: true, color: WHITE, fontFace: F, margin: 0 });
    s.addText(d, { x: x + 0.28, y: 4.92, w: cw - 0.56, h: 0.72, fontSize: 10.5, color: BODY, fontFace: F, margin: 0, lineSpacing: 13 });
  });
  s.addText("KOI content pack  ·  Cortex XSIAM & Cortex XSOAR", {
    x: M, y: 6.35, w: W, h: 0.3, fontSize: 11, color: MUTED, fontFace: F, margin: 0,
  });
  s.addNotes("Close: the three places to go for detail.");
}

const out = path.join(__dirname, "KOI_Content_Pack_Overview.pptx");
pres.writeFile({ fileName: out }).then(() => console.log("written", out));
