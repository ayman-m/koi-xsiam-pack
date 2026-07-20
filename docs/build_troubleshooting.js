/* Build "KOI Content Pack — Troubleshooting & Data Provenance Guide" (.docx)
   Run:  NODE_PATH=<dir with docx> node build_troubleshooting.js                  */
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
  rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0,
    children: r.map((t, j) => cell(t, { w: widths[j], header: i === 0,
      mono: i > 0 && (opts.mono || []).includes(j),
      color: i > 0 && r.__color ? r.__color : undefined })) })) });

const hr = new Paragraph({ spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } }, children: [] });

/* ---------------- Cover ---------------- */
const cover = [
  new Paragraph({ spacing: { before: 2600, after: 200 }, children: [
    new TextRun({ text: "KOI Content Pack", bold: true, size: 68, color: ORANGE, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 120 }, children: [
    new TextRun({ text: "Troubleshooting & Data Provenance", bold: true, size: 38, color: SLATE, font: "Calibri" })] }),
  hr,
  new Paragraph({ spacing: { after: 200 }, children: [
    new TextRun({ text: "For Cortex XSIAM — Windows endpoints", size: 30, color: GRAY, font: "Calibri" })] }),
  new Paragraph({ spacing: { after: 400 }, children: [
    new TextRun({ text: "Every finding in this guide was verified on a live tenant and a live Windows endpoint. Commands shown are the ones that actually worked, including the ones that silently do not.",
      size: 22, italics: true, color: GRAY, font: "Calibri" })] }),
  table([2600, 6760], [
    ["Document", "KOI Content Pack — Troubleshooting & Data Provenance"],
    ["Applies to", "Cortex XSIAM, KOI on Windows (Server 2022 verified)"],
    ["Pack version", "1.3.0"],
    ["Verified on", "win-workstation, 20 July 2026"],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  p("Table of Contents", { bold: true, size: 28 }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ---------------- 1. Model ---------------- */
const model = [
  h1("1. How the Pieces Actually Fit Together"),
  p("Most KOI troubleshooting goes wrong because of one incorrect assumption: that a KOI agent runs continuously on the endpoint. On Windows it does not."),
  h2("1.1 There is no resident KOI agent"),
  p("On a live Windows endpoint we checked for all three ways software can persist, and found none of them:"),
  table([3200, 6160], [
    ["Checked", "Result"],
    ["Windows service named *koi*", "None. sc query returns nothing."],
    ["Running process named *koi*", "None in tasklist."],
    ["Scheduled task named *koi*", "None in schtasks."],
  ]),
  p("KOI on Windows is run-on-demand. The Cortex agent executes the KOI deployment script; the script scans, uploads its findings, refreshes its configuration and exits. Between runs nothing KOI is resident."),
  rich([{ text: "Consequence: the XSIAM Job is the scan scheduler. ", bold: true },
        { text: "No Job run means no scan — not a delayed scan, not a partial scan. Nothing. Any investigation into stale KOI data should start with the Job, not the endpoint." }]),
  h2("1.2 The end-to-end chain"),
  p("Every data point you see in KOI traverses this chain. Knowing which link you are looking at tells you which tool to reach for:"),
  code("XSIAM Job  ->  Koi Unified - Script Runner  ->  core-script-run"),
  code("        ->  KOI deployment script on the endpoint"),
  code("        ->  reads filesystem / registry / browser profiles"),
  code("        ->  HTTPS POST to the KOI backend"),
  code("        ->  koi-* integration commands read it back"),
  p("A break at any link presents identically from the console: KOI data looks stale. Sections 5 and 6 give a test for each link."),
];

/* ---------------- 2. Channels ---------------- */
const step_ch = newStep();
const channels = [
  h1("2. The Three Diagnostic Channels"),
  p("Three independent ways to interrogate the same endpoint. Using more than one is what turns a guess into a diagnosis, because each sees a different link in the chain."),
  table([1500, 3200, 4660], [
    ["Channel", "What it shows", "Use it when"],
    ["KOI integration", "What the KOI backend believes, after the last successful scan", "Confirming data reached KOI"],
    ["XSIAM core", "The live endpoint, via the Cortex agent, running as SYSTEM", "Confirming the endpoint's real state without leaving XSIAM"],
    ["Direct PowerShell", "The raw filesystem and registry, as an interactive admin", "Establishing ground truth to compare the other two against"],
  ]),
  h2("2.1 Channel A — the KOI integration"),
  p("Runs from any war room or the playground. Answers the question \"what does KOI think is installed?\""),
  code("!koi-devices-list limit=50"),
  code("!koi-device-inventory-get device_id=<koi-device-id> limit=50"),
  code("!koi-inventory-item-get item_id=<id> marketplace=<mp>"),
  rich([{ text: "Note: ", bold: true }, { text: "the KOI device id is not the Cortex endpoint id and not the hostname. Find it in agent_policies.json on the endpoint (section 3.2), or by matching hostname in koi-devices-list." }]),
  h2("2.2 Channel B — XSIAM core commands"),
  p("Runs arbitrary commands on the endpoint through the Cortex agent. Requires only that the endpoint is CONNECTED — no credentials, no network path, no open ports."),
  code('!core-run-script-execute-commands endpoint_ids="<endpoint_id>" commands="<command>" timeout=600'),
  p("The command returns an action_id, not the output. Fetch the output separately:"),
  code('!core-get-script-execution-results action_id="<action_id>"'),
  h2("2.3 Channel C — direct PowerShell over SSH"),
  p("For a GCP-hosted Windows endpoint reached through Identity-Aware Proxy. Establish the tunnel, then connect:"),
  code("gcloud compute start-iap-tunnel <instance> 22 --local-host-port=localhost:2222 --zone <zone>"),
  code("ssh -i ~/.ssh/<key> -p 2222 <admin-user>@localhost"),
  p("Three prerequisites, each of which we hit as a real failure — see section 7.3 for the diagnosis:"),
  step_ch("An SSH server must be installed and running on the guest."),
  step_ch("The public key must be in C:\\ProgramData\\ssh\\administrators_authorized_keys, with inheritance removed and access granted only to Administrators and SYSTEM. sshd silently ignores the file otherwise."),
  step_ch("The instance must carry the network tag the IAP firewall rule targets. A rule scoped to a tag does nothing for an instance without it."),
];

/* ---------------- 3. File map ---------------- */
const filemap = [
  h1("3. KOI on Windows — the File Map"),
  h2("3.1 Everything lives in one directory"),
  rich([{ text: "C:\\ProgramData\\Koi\\", bold: true, font: "Consolas" },
        { text: "  — there is no Program Files install." }]),
  table([2900, 1400, 5060], [
    ["File", "Typical", "Purpose"],
    ["settings.json", "~10 KB", "Scan configuration pulled from the backend: every collector module and whether it is enabled — browsers, package managers, IDE, Office, installed software, AI tooling, and the remediation actions."],
    ["agent_policies.json", "~1 KB", "Enforcement policy set: policies with target agents, enforcement mode and rules, plus exclusions, the approval URL and the block message template shown to the user."],
    ["agent_activity.jsonl", "0 B when idle", "Append-only JSON Lines record of agent activity."],
    ["agent_enforcement.log", "0 B when idle", "What the enforcement engine evaluated and blocked."],
    ["koi_agent_enforcement", "symlink", "Points at the active versioned module directory. Repointing this symlink is how an upgrade takes effect."],
    ["koi_agent_enforcement_v<hash>", "directory", "Versioned enforcement runtime. Multiple versions are retained; the previous one stays for rollback."],
  ]),
  rich([{ text: "Both log files being zero bytes is normal ", bold: true },
        { text: "on a host where nothing has been blocked. It is not evidence of a broken agent." }]),
  h2("3.2 The two fields you will need"),
  p("agent_policies.json carries the identifiers that tie this endpoint to your KOI tenant:"),
  table([2400, 6960], [
    ["Field", "What it is"],
    ["approval_url -> cid", "Your KOI customer/tenant id."],
    ["approval_url -> deviceId", "The KOI device id for this endpoint — the value koi-device-inventory-get expects."],
    ["mdm_version", "Version of the policy schema the agent is running."],
  ]),
  h2("3.3 KOI ships its own Python"),
  p("A bundled WinPython runtime is installed under the Default user profile. It is reachable by two paths that resolve to the same place — the second is a junction:"),
  code("C:\\Users\\Default\\AppData\\Local\\Koi\\Python\\WPy64-31290\\python\\python.exe"),
  code("C:\\Users\\Default\\Local Settings\\Koi\\Python\\WPy64-31290\\python\\python.exe"),
  rich([{ text: "This matters for interpreting inventory. ", bold: true },
        { text: "PyPI packages can appear in KOI on a host where nobody ever installed Python, because KOI is partly inventorying its own interpreter. Do not treat that as a false positive or as shadow IT." }]),
];

/* ---------------- 4. Provenance ---------------- */
const provenance = [
  h1("4. How Each Data Point Is Collected"),
  p("This section traces individual data points from disk to the KOI console. It exists so that when a value looks wrong, you can tell whether KOI is wrong or your comparison is."),
  h2("4.1 Browser extensions"),
  p("Source of truth on disk, per user profile:"),
  code("C:\\Users\\<user>\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\<id>\\<version>_0\\manifest.json"),
  p("The scanner walks every user profile, then for each extension reads the id from the directory name, the version from manifest.json, and the display name as described below."),
  rich([{ text: "The display name is usually not in manifest.json. ", bold: true },
        { text: "Chrome stores a localization placeholder there instead. Verified on a live host, three of four extensions resolved their name from a locale file, not the manifest:" }]),
  table([3000, 1200, 5160], [
    ["Extension", "Version", "Where the display name came from"],
    ["Google Translate", "2.0.16", "_locales\\en\\messages.json, key 8969005060131950570"],
    ["Google Docs Offline", "1.106.1", "_locales\\en\\messages.json, key extName"],
    ["Fireflies: AI meeting notes", "6.3.1", "manifest.json:name (literal — the exception)"],
    ["Chrome Web Store Payments", "1.0.0.6", "_locales\\en\\messages.json, key APP_NAME"],
  ], { mono: [] }),
  p("So a manifest.json whose name reads __MSG_8969005060131950570__ is not corruption. KOI resolves it through _locales\\<lang>\\messages.json exactly as Chrome does. Comparing KOI's display name against manifest.json:name alone will produce a false mismatch."),
  h2("4.2 Installed software"),
  p("Read from the registry uninstall hives. Both must be read — querying only the first misses every 32-bit application on a 64-bit host:"),
  code("HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"),
  code("HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"),
  p("Only entries carrying a DisplayName are inventory candidates."),
  h2("4.3 Code packages"),
  p("PyPI and npm inventory comes from the package metadata of the interpreters and package managers present on the host — including KOI's own bundled Python described in section 3.3."),
  h2("4.4 Configuration and policy"),
  p("settings.json and agent_policies.json are not written locally by the scan. They are pulled from the backend on each run, which makes their modification time the single most useful signal on the endpoint — see section 6."),
];

/* ---------------- 5. Verify scan ---------------- */
const verifyScan = [
  h1("5. Verifying That a Scan Completed"),
  p("Three independent checks, one per link in the chain. Run them in order; the first one that fails localises the fault."),
  h2("5.1 Check 1 — did XSIAM dispatch and complete the script?"),
  p("In the Job run's war room, the per-entry result should carry ok:true and an action_id. Then confirm the action itself:"),
  code('!core-get-script-execution-results action_id="<action_id>"'),
  table([2800, 6560], [
    ["Field", "Expected on success"],
    ["execution_status", "COMPLETED_SUCCESSFULLY"],
    ["_return_value", "0"],
    ["failed_files", "0"],
    ["endpoint_status", "STATUS_010_CONNECTED"],
  ]),
  h2("5.2 Check 2 — did the script run on the endpoint?"),
  p("The on-box proof. Both files should carry a modification time equal to the run:"),
  code("dir C:\\ProgramData\\Koi"),
  p("If check 1 passed but these timestamps are old, the script was dispatched and reported success without completing its work — look at the script itself, not at XSIAM."),
  h2("5.3 Check 3 — did the data reach KOI?"),
  p("The authoritative check. Using the deviceId from agent_policies.json:"),
  code("!koi-device-inventory-get device_id=<deviceId> limit=50"),
  p("Every returned item carries a Last Seen. On a healthy host that timestamp matches the run time from checks 1 and 2. If checks 1 and 2 passed and this is stale, the endpoint could not reach the backend — go to section 6."),
];

/* ---------------- 6. Verify backend ---------------- */
const verifyBackend = [
  h1("6. Verifying Backend Connectivity"),
  p("Work outwards from the endpoint. Each step isolates a different failure."),
  h2("6.1 Name resolution"),
  code("nslookup <your-koi-backend-host>"),
  p("The KOI backend is fronted by a CDN, so expect the answer to resolve to a CDN hostname and address rather than to KOI directly. That is normal."),
  h2("6.2 TLS and HTTP"),
  p("Avoid Test-NetConnection through the XSIAM channel — see section 7.4. Use curl and write the headers to a file:"),
  code("curl.exe -sS -m 20 -D C:\\Windows\\Temp\\koihdr.txt -o NUL https://<your-koi-backend-host>/"),
  code("type C:\\Windows\\Temp\\koihdr.txt"),
  p("Response headers prove DNS, routing, TLS and HTTP all work."),
  h2("6.3 The check that actually matters"),
  rich([{ text: "Reachability is not proof of a working agent. ", bold: true },
        { text: "settings.json and agent_policies.json are only rewritten after the agent authenticates and successfully pulls its configuration. A fresh modification time on those two files is the only evidence that the complete round trip — including credentials and enrolment — succeeded." }]),
  p("Read the two together:"),
  table([3400, 5960], [
    ["Observation", "Conclusion"],
    ["Headers return, config files fresh", "Fully healthy."],
    ["Headers return, config files stale", "Network is fine. Suspect enrolment, credentials or the script failing before its config fetch."],
    ["No headers", "Network path problem: egress filtering, proxy, TLS interception or DNS."],
  ]),
];

/* ---------------- 7. Symptom table ---------------- */
const symptoms = [
  h1("7. Symptom, Cause, Fix"),
  p("Every entry below was observed in practice, not imagined."),
  h2("7.1 The Job runs but nothing is ever scanned"),
  p("The most common failure, and the most misleading, because every run reports success and closes cleanly."),
  table([2700, 3200, 3460], [
    ["Symptom", "Cause", "Fix"],
    ["Every entry reports SKIPPED, no failure email, run closes as Resolved", "No connected, unisolated endpoint matches the entry's OS and group scope. This is the designed skipped state, deliberately silent", "Compare group membership against connected status — see 7.2"],
    ["Job never fires at all", "Job disabled, or its schedule never reached", "Check schedulingStatus and nextRunTime on the Job"],
    ["Run parks in running for a long time", "The script's own timeout is longer than the Job interval, so runs overlap", "Lengthen the interval or shorten the script timeout"],
  ]),
  h2("7.2 The endpoint targeting trap"),
  p("A skipped run means the intersection of three conditions was empty. All three must hold simultaneously:"),
  bullet("The endpoint is a member of a group named in target.endpoint_groups"),
  bullet("Its status is CONNECTED — not DISCONNECTED and not LOST"),
  bullet("Its OS matches target.endpoint_os, and it is unisolated"),
  p("The classic case, seen live: the only member of the target group was disconnected, while the two connected machines that could have run the script were not in the group. Both facts are individually unremarkable; together they produce a job that runs forever and does nothing."),
  code("!core-get-endpoints group_name=\"<group>\" status=\"connected\" isolate=\"unisolated\""),
  p("An empty result here is the whole explanation. Note that the endpoint list in the console shows group membership and status in separate columns — it is easy to confirm one and assume the other."),
  h2("7.3 Cannot get a shell on the endpoint"),
  table([2700, 3200, 3460], [
    ["Symptom", "Cause", "Fix"],
    ["IAP tunnel: failed to connect to backend, port 22", "The firewall rule allowing IAP to 22 is scoped by network tag and the instance lacks that tag", "Add the tag the rule targets"],
    ["enable-windows-ssh metadata has no effect", "The Google guest agent is what consumes that metadata. If it is stopped or disabled, the flag is inert", "Check the guest agent's state before trusting any metadata-driven mechanism"],
    ["Password reset does not work either", "Same root cause — that path is also handled by the guest agent", "Install and configure an SSH server directly instead"],
    ["Key is present but sshd rejects it", "administrators_authorized_keys must have inheritance removed and grant only Administrators and SYSTEM", "icacls <file> /inheritance:r /grant Administrators:F /grant SYSTEM:F"],
  ]),
  h2("7.4 The tooling lies to you"),
  p("Three behaviours that produce confidently wrong answers. Each cost real investigation time."),
  table([2900, 6460], [
    ["Behaviour", "What to do instead"],
    ["powershell -Command - executes piped stdin line by line, so multi-line foreach and if blocks break apart. You get a header, no rows, and no error", "Use -EncodedCommand with base64 UTF-16LE. This is the single most important tip in this guide: it turns silent wrong answers into correct ones"],
    ["The XSIAM script channel mangles pipe characters and nested quotes, so findstr filters return nothing and appear to prove absence", "Return the unfiltered output and filter it locally"],
    ["Get-ChildItem with -ErrorAction SilentlyContinue hides access and path errors, so a permissions problem looks like an empty directory", "Drop the suppression while diagnosing, and confirm with Test-Path"],
  ]),
  h2("7.5 Duplicate device records in KOI"),
  p("A host that has been re-enrolled can hold more than one record in KOI: an old one under the hostname, stale for weeks, and a current one under the device id the agent now reports."),
  rich([{ text: "Searching KOI by hostname finds the stale record and leads to exactly the wrong conclusion. ", bold: true },
        { text: "Always verify with the deviceId taken from agent_policies.json on the endpoint itself. If the id-based lookup is fresh and the hostname-based one is stale, the scan is working and the old record needs cleaning up." }]),
];

/* ---------------- 8. Reference ---------------- */
const reference = [
  h1("8. Command Reference"),
  h2("8.1 XSIAM — Job and endpoint state"),
  code('!core-get-endpoints group_name="<group>" status="connected" isolate="unisolated"'),
  code('!core-run-script-execute-commands endpoint_ids="<id>" commands="<cmd>" timeout=600'),
  code('!core-get-script-execution-results action_id="<action_id>"'),
  h2("8.2 KOI — what the backend believes"),
  code("!koi-devices-list limit=50"),
  code("!koi-device-inventory-get device_id=<deviceId> limit=50"),
  code("!koi-users-list limit=1"),
  h2("8.3 On the endpoint"),
  code("dir C:\\ProgramData\\Koi"),
  code("type C:\\ProgramData\\Koi\\agent_policies.json"),
  code("sc query sshd"),
  code("nslookup <koi-backend-host>"),
  code("curl.exe -sS -m 20 -D C:\\Windows\\Temp\\koihdr.txt -o NUL https://<koi-backend-host>/"),
  h2("8.4 Running PowerShell reliably over SSH"),
  p("Encode the script rather than piping it, for the reason given in 7.4:"),
  code("python3 -c \"import base64;print(base64.b64encode(open('s.ps1').read().encode('utf-16-le')).decode())\""),
  code("ssh -i <key> -p 2222 <user>@localhost \"powershell -NoProfile -EncodedCommand <base64>\""),
  h2("8.5 Fast triage order"),
  const_steps(),
];

function const_steps() {
  const s = newStep();
  return [
    s("Is the Job enabled and did it run? Check schedulingStatus and lastRunTime."),
    s("Did each entry return ok:true, or SKIPPED? SKIPPED means targeting — go to 7.2."),
    s("Did the action complete? COMPLETED_SUCCESSFULLY with return value 0."),
    s("Are the endpoint's config files fresh? dir C:\\ProgramData\\Koi."),
    s("Is KOI's inventory fresh for the deviceId from agent_policies.json?"),
    s("If not, test the backend path — section 6 — and remember reachability alone proves nothing."),
  ];
}

/* ---------------- assemble ---------------- */
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
      children: [new TextRun({ text: "KOI — Troubleshooting & Data Provenance   ·   ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ text: " / ", size: 16, color: GRAY, font: "Calibri" }),
                 new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: "Calibri" })] })] }) },
    children: [...cover, ...toc, ...model, ...channels, ...filemap, ...provenance,
               ...verifyScan, ...verifyBackend, ...symptoms, ...reference.flat()],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = __dirname + "/KOI_Troubleshooting_Guide_v1.0.docx";
  fs.writeFileSync(out, buf);
  console.log("written " + buf.length + " bytes -> " + out);
});
