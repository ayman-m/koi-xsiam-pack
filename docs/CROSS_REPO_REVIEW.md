# Cross-repo review — what the Marketplace project has that we should take

**Date:** 2026-07-24 · **Target:** `koi-xsiam-pack` (custom, 26 cmds, extended schema)
**Source:** `koi-xsiam-markeplacepack` (`Packs/KoiContentExtension`, 13 cmds, default integration)

Framing fact that makes almost all of this portable: **both packs ingest the same
`koi_koi_raw` dataset with the same OCSF schema, from the same KOI API.** So the
marketplace project's live findings describe data *we* also consume — they are not
marketplace-specific. Our integration also carries the **identical 22-value long-form
`marketplace` predefined list**, which turns the vocabulary mismatch from a "schema
difference" into a portable bug fix.

---

## ⚠ CORRECTIONS (2026-07-25, after auditing our own integration source)

Two Tier-1 items below were mis-attributed when first written. Both measurements are
real; the CAUSE was wrong. Recorded here rather than quietly edited.

**1.6 tenant attribution — NOT a defect in this pack.** `koi_tenant_name` and
`koi_customer_id` are not KOI API fields. This pack's integration stamps them in
`Client.send_events` (Koi.py:1219-1224) from the optional `tenant_name` parameter
(Koi.yml:23) and the customer id decoded from the API key. The Marketplace integration
has no such parameter (0 references in its YAML) and never writes them. The test tenant
now collects with the Marketplace pack, which is why the last 24h shows 0 of 61 while
90 days shows 19,624 of 32,702 — the collector changed, KOI did not. Under this pack the
mapping works. No fix needed; the modeling rule comment has been corrected to say so.

**1.2 alert duplication — this pack already defends against it at fetch time.** Our
integration has two-stage dedup (`get_event_id` Koi.py:324-404, `deduplicate_events`
Koi.py:407-484): within-batch, then cross-cycle against the prior fetch's ids, keyed on
a composite per-occurrence tuple (finding_uid, device_id, item_id, time). It was built
through two tracked bugs and its history is documented in the source. The Marketplace
integration has no equivalent, so the ~709x amplification measured on this tenant is a
property of ITS collection, not ours.

That does not make the dedupe work wasted, but it reframes it: the content fixes
(parsing-rule dedupe key, Alert Triage gate, dashboard dedup) are DEFENSIVE — they make
this pack's content correct against a koi_koi_raw populated by either collector, and
against duplicates that can still slip past a cross-cycle HWM boundary. They are not
repairing a defect in this pack's collection path.

---

## TIER 1 — Confirmed live defects in our pack

### 1.1 Our Alert Triage chain is broken on real alerts  🔴 CRITICAL
`KOI IR - Extract Alert Context` regex-extracts `koi_context=(\{.*\})` from `${incident.details}`.
**Verified on tenant 2026-07-24:** real correlation alerts do NOT contain it. Only the
`[SIM3]` simulated alerts we generated ourselves do.

Real alert, id 181370:
    name:    Koi: "$item_name" — low risk on NULL (npm)
    details: Koi flagged NULL "$item_name" (package: @anthropic-ai/sdk, version 0.104.2) from npm.
             • Findings: NULL finding(s) — categories: EMPTY
             • Device: NULL — user: NULL, OS: NULL, status: active
             • Identity: NULL / NULL (finding_uid NULL)

Two failures at once: the correlation rule emits an unexpanded `$item_name` and NULLs for
almost every field, AND there is no `koi_context` blob. Result: `KoiContext` is empty and the
entire triage chain degrades to default-Suspicious for every real alert.

FIX (this is the single highest-value port): adopt the marketplace approach — read the real
OCSF payload directly via `${alert.finding_info}` / `.observables` / `.resources` / `.metadata`
(their Extract Alert Context is 27 tasks doing ~20 extractions) instead of depending on a
hand-authored description blob. Removes the dependency on a customer-authored correlation rule.

### 1.2 No alert dedupe — one alert can trigger up to 245 investigations  🔴
The integration re-sends every STILL-OPEN alert on each 1-min fetch, so a `koi_koi_raw` row is
a *fetch*, not an alert. Measured: 734 rows -> 3 distinct alerts in 24h (**245x**); 1,048 -> 317
over 90d. One notification: 357 rows, 1 distinct `_time`, 357 distinct `_insert_time`.
Audit is unaffected (1.0x).
Only `metadata.notification_event_id` is a correct dedupe key (317 distinct, 1:1 with
(item.id, device.id, finding_uid, created_time), zero collisions).
  - `koi_event_id` = 20 distinct = SCAN BATCH (our parsing-rule comment calling it a
    "per-occurrence UUID" is wrong)
  - `finding_uid`  =  3 distinct = POLICY DEFINITION
We promote **no** `koi_notification_id` at all and have **no** dedupe gate.
Consequences: duplicated investigations, duplicated device sweeps, duplicated approval gates,
and risk of tripping XSIAM's 5,000-hits/24h correlation-rule auto-disable.

### 1.3 58% of marketplace values would HTTP-400  🔴  [VERIFIED ON OUR TENANT]
KOI's EVENT vocabulary != its API vocabulary. Our koi_koi_raw, 90d, 13,912 populated rows,
**8,124 (58%) rejected**:
  software_windows 5,183 · chrome 1,101 · built_in 839 · software_mac 637 · vsc 196 ·
  github 72 · edge 27 · npp 22 · firefox 21 · openvsx 10 · side_loaded 6 · jet 5 ·
  ollama 4 · huggingface 1
Mapping: software_windows->windows, software_mac->mac, chrome->chrome_web_store,
 edge->edge_add_ons, firefox->firefox_add_ons, vsc->vscode, jet->jetbrains, npp->notepad++,
 openvsx->open_vsx_registry, github->github_mcp_registry; 22 API values pass through;
 built_in/side_loaded/ollama -> EMPTY (they are installation_method leaking in).
!! OUR DATA HAS ONE THEIR MAP MISSES: `huggingface` -> `hugging_face`. Add it.
We have 10 command call sites passing raw event values. On the WRITE path this means
**a block the analyst approved that silently never happened.**

### 1.4 Allowlisted items get routed for blocking  🔴  [VERIFIED]
Our `KOI IR - Investigate Item` never calls `koi-allowlist-get` and never sets
`KoiInvestigation.allowlisted_count`. Our integration HAS the command (Koi.yml:191); no
playbook anywhere calls it. Governance therefore can never distinguish "not governed" from
"explicitly allowed" -> an allowlisted item is a valid block candidate.

### 1.5 The auto-close path is unreachable  🟠
Our benign verdict requires `alert_type == "New Item"` AND `risk_level == "Low"`.
Live data has exactly ONE alert_type value: `policy_violation`. So all four of our
alert_type branches are dead and nothing can ever auto-close.
Re-key the verdict matrix onto risk_level / item_type / org_risk / blocklist state.

### 1.6 Tenant attribution is dead  🟠  [VERIFIED ON OUR TENANT]
  90 days : 32,702 rows | 19,624 with koi_tenant_name/koi_customer_id
  last 24h:     61 rows | **0** with either
Our modeling rule maps xdm.observer.name = coalesce(koi_tenant_name, koi_customer_id) and
xdm.observer.unique_identifier = koi_customer_id -> both NULL on all new events.
The multi-tenant attribution we advertise in the customer guide no longer works.

### 1.7 33 dashboard widgets count duplicated rows  🟠
All 52 widget queries are scoped to source_log_type="Alerts"; 33 use bare `count()` over the
245x-duplicated rows; 11 use count_distinct(item_id/device_id/package_name) which dedupes by
item, not by alert. Every alert count in our dashboard is wrong.
Fix: count_distinct(koi_notification_id) — requires 1.2 first.

---

## TIER 2 — Correctness/robustness fixes (low effort)

2.1 Modeling-rule mis-mappings (ModelingRules/Koi/Koi.xif):
    :24 original_alert_id = finding_uid  -> finding_uid is a POLICY id, not an alert id. Remove.
    :33 fqdn = alert_hostname            -> 0 of 1,138 hostnames contain a dot. Remove.
    :22 event.id = koi_event_id          -> that's the scan batch. Repoint to _id.
2.2 risk_level case conflation — we compare High/Critical/Low (the SEVERITY ladder); the
    risk_level vocabulary is lowercase low/medium/pending/high/critical. Add pending+medium.
2.3 Alert Triage tasks '2' and '18': descriptions say "id AND marketplace", the YAML is a
    single outer group = OR. Items with an id and no marketplace slip into the
    marketplace-requiring path. Gate on item_id alone.
2.4 Array-vs-scalar guards: we have 5 `join` guards total; they have 46 + 4 LastArrayElement.
    Worst: Investigate Item task '4' sets limit:'5' then reads 9 values as bare scalars, and
    task '6' feeds ${Koi.Inventory.version} into a required:true argument. Set limit:'1'.
2.5 Empty-string false-pass on item.version — 831 of 842 MCP alerts send
    {"name":"item.version","value":""}; the key EXISTS so `!= null` passes. Add a `!= ""` guard.
2.6 No empty-marketplace guard before `koi-blocklist-items-add` (Block_and_Remediate task '5').
2.7 Zero DeleteContext tasks anywhere; koi-inventory-list APPENDS, and we run Investigate Item
    TWICE on the Malicious path (Alert Triage 14, then 17 -> Block and Remediate 1), both
    separatecontext:false. Port their "clear prior inventory context" pattern.
2.8 Dead `version` plumbing: inputs.version declared on Investigate Item + Enrich Item but
    never referenced; Alert Triage passes ${KoiContext.version} which isn't a declared output.
2.9 `view` predefined list is incomplete — ours offers 6, the API accepts 9. Missing
    mcp_servers, repositories, all_items. Our OWN MCP Server Audit passes view=mcp_servers,
    which is not selectable in our dropdown. `repositories` is real data we hide.
    `all_items` is accepted but returns 0 -> never use it; omitting view returns everything.
2.10 Our MCP Server Audit description claims it "(optionally) hands it to KOI - Block &
    Remediate" — there is no such task. It also hardcodes instance_name: KOI_PAET.
2.11 pack_metadata.json declares NO dependencies at all. Add Core, CommonScripts,
    FiltersAndTransformers. NOT CortexXDR — verified on the tenant 2026-07-26: XSIAM
    auto-provisions the XQL Query Engine (its instance carries the platform's
    _default_instance suffix) and that brand serves xdr-xql-generic-query. XSIAM is the
    XDR; requiring a separate Cortex XDR integration would be wrong.
2.12 Latent scale bug (ours alone, they can't help): Investigate Item tasks '8'/'9' fetch
    limit:'100' org-wide then filter client-side -> past 100 rows counts silently report 0
    instead of "unknown".

---

## TIER 3 — New capability worth taking

3.1 XQL QUERY LIBRARY — **port as-is, zero changes needed.**
    72 .xql files: 26 hunting (H1-H4) + 46 detection (A-D), plus HUNTING_QUERIES.md (1,350
    lines), DETECTION_QUERIES.md (2,035), QUERY_LIBRARY.md (272, operator guide).
    Verified compatible: same dataset name; **zero xdm.* references in all 72 files** (they
    read raw columns, so our modeling rule is irrelevant to them); all 17 flat columns present;
    the 4 JSON blob columns survive our parsing. We have NO query library today.
    Caveat: their internal bookkeeping is stale (B11 undocumented; appendix claims 7 hunts
    "not shipped" when all 7 exist; per-theme counts sum to 19 not 26). Clean on port.

3.2 HUNT SWEEP + HUNT MATCH INVESTIGATION — portable with 5 changes.
    Job-triggered 4-lane XQL hunt (H2.1/H2.6/H1.3/H4.2) -> normalize -> auto-investigate ->
    optional analyst-gated block (auto_block hard-wired false). Finds risk NOBODY alerted on.
    Zero overlap with our MCP Server Audit (which only asks KOI's inventory what KOI already
    scored; H4.2 is the exact inverse — agentic software on KOI-covered hosts KOI never
    inventoried). All 13 marketplace commands are a strict subset of our 26 — nothing missing.
    Changes: rename sub-playbook ids; fix the allowlist gap (1.4); add marketplace to H2.6's
    fields; add pack dependencies; drop/add xql_time_frame.
    Bonus once ported: our koi-findings-list (we have it, they don't) can refresh H2.1's
    hardcoded finding-id set from the API instead of pinning it.

3.3 XDR x KOI CORRELATION ENRICHMENT — 3 of 4 are drop-ins.
    D2  -> Investigate Item  : did the item actually EXECUTE (xdr_data), sets xdr_evidence_count
    D3c -> Investigate Device: KOI scan freshness per host
    D4  -> Investigate Device: host acquisition timeline (koi_koi_raw UNION xdr_data)
    D5  -> Alert Triage      : NEEDS REWORK — needs a time anchor (we have no KoiRaw) and an
                               attach point (we have no dedupe tasks; fix 1.2 first)

3.4 INCIDENT FIELDS + TYPE + LAYOUT — 19 fields, 7 portable as-is, 11 re-point, 1 skip.
    Mechanism: one `|||setAlert` task with 19 args keyed by cliName. Our Alert Triage ALREADY
    has a setAlert task, so the mechanism is proven — only the arg values need re-pointing.
    !! COLLISION RISK: IncidentFields/Types/Layouts are TENANT-GLOBAL, keyed by id, NOT
    namespaced per pack. Both packs land on the same tenant. Porting unchanged = all 21 objects
    collide, last install silently wins, and the two packs' setAlert sources differ
    semantically. => Port under distinct ids (koicustomitemid / "KOI Custom Supply Chain Alert").

3.5 GATEWAY MODE (unmerged branch origin/feat/gateway-mode-content, 14 files, +1,767 lines)
    - 4 promoted parsing columns for approval_requests audit rows (decision/requester/decider/
      risk) — those rows carry action=null so the lifecycle was trapped in free-text `message`.
      Live-validated: 11 rows, decision 11/11, requester 11/11, zero leakage into 20,410 others.
    - KOI Ext - Gateway Approval Triage (624 lines) — recommends, never approves.
    - Key structural insight: a BLOCKED item is NOT in inventory (the block prevented the
      install), so inventory enrichment returns nothing by construction.
    - Gateway Allowed/Blocked verdicts are CONSOLE-ONLY and never reach XSIAM => you cannot
      alert on a block. Only approval_requests are exported.
    We have ZERO approval/gateway handling. Take only if the customer uses gateway mode.

---

## Where WE are ahead
- 3 parsing-rule columns they lack: device_network_user, mcp_installation_method, mcp_package_type
- We ship a ModelingRules XDM mapping that predates theirs
- Richer command surface (Koidex catalog risk, AI summary, remediation/approval history)
Otherwise **no guard, condition or error branch exists in our pack that theirs lacks** —
every structural difference runs the other way.

## Reverse-port (fix in THEIR repo)
Their `KOI Ext - Enrich Item` tasks 4/7/11/12 use join('') on Koi.Inventory where
LastArrayElement is correct — with >1 record that concatenates into garbage
("chrome_web_storenpm"). Latent only because Enrich Item has no callers yet.

## Explicitly NOT a gap
- Dashboards are equivalent (11 widgets each; the size difference is formatting)
- The YAML 1.1 bare-`yes` boolean bug is absent from BOTH repos (verified by PyYAML scan)
- MCP Server Audit is already in sync (only description text + task-id differences)

## Still unknown (state honestly)
- Whether `isEqualString` is case-sensitive on this platform version (their author asserts yes)
- Whether koi-koidex-risk-report rejects short-form marketplace (its arg is required but has
  no predefined list; only the inventory endpoint was tested)
