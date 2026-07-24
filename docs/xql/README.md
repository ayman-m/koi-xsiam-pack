# XQL query library — KOI supply chain × Cortex XDR

72 queries: **26 hunting** (H1–H4) + **46 detection** (A–D). Query bodies live here as
`<id>.xql`; the prose guides are one level up:

| Guide | What it is |
|---|---|
| [`../QUERY_LIBRARY.md`](../QUERY_LIBRARY.md) | **Start here.** Operator guide — the standing correctness rules, CU discipline, the KOI finding vocabulary, and which queries make good correlation rules. No query bodies. |
| [`../HUNTING_QUERIES.md`](../HUNTING_QUERIES.md) | The 26 hunts, with hypothesis and interpretation for each |
| [`../DETECTION_QUERIES.md`](../DETECTION_QUERIES.md) | The 46 detections, by theme |

## Themes

| Theme | Count | Subject |
|---|---|---|
| **A** | 8 | Supply-chain acquisition |
| **B** | 13 | Agentic runtime |
| **C** | 13 | KOI coverage / integrity |
| **D** | 12 | Investigation & playbook queries |
| **H1** | 7 | Composition anomalies |
| **H2** | 6 | KOI risk-signal |
| **H3** | 7 | Runtime behavioural |
| **H4** | 6 | Cross-dataset |

Datasets: `koi_koi_raw` (44 files), `xdr_data` (51), `endpoints` (1 — `C12` only). Several
span both; 11 do true cross-dataset joins.

## Provenance and applicability

These queries were written and live-validated against the **Marketplace KOI pack** and its
`koi_koi_raw` dataset, so their header comments reference that pack. **They apply unchanged to
this pack**, verified on 2026-07-25:

- Both packs ingest the **same `koi_koi_raw` dataset** from the same KOI API with the same
  OCSF schema — this pack's parsing rule declares `target_dataset="koi_koi_raw"` too.
- **Zero `xdm.*` references across all 72 files.** They read raw dataset columns exclusively,
  so this pack's modeling rule is irrelevant to them and modeling-rule drift cannot break them.
- Every flat column they use is present, and the four JSON blob columns
  (`resources`, `metadata`, `observables`, `finding_info`) survive this pack's parsing rule —
  it only *adds* columns, it never drops the originals.

Spot-checked live on this tenant (H2.1, H1.3, A1, C1, D2): all returned results.

> **Optimisation available, not applied.** This pack's parsing rule natively promotes
> `item_id`, `alert_hostname`, `mcp_*` and friends, which several queries re-derive from
> `resources` with `alter`. Using the native columns would make those queries ~10 lines
> shorter. Left as-is so the library stays diff-able against its source.

## The one rule you must not break

**Alerts are re-sent on every fetch.** A `koi_koi_raw` Alerts row is a *fetch*, not an alert —
measured at up to **245 rows per distinct alert in 24h**. Any query that counts alerts must
dedupe on `metadata.notification_event_id`:

```
| alter nid = json_extract_scalar(metadata, "$.notification_event_id")
| comp count_distinct(nid) as alerts by ...
```

`koi_event_id` is the **scan batch** and `finding_uid` is the **policy definition** — neither
is per-alert. Audit rows are unaffected (1.0×). The shipped queries already follow this.

## Validation status

Hunting: 20 validated / 2 parse-confirmed / 4 not-run.
Detection: 40 validated / 4 parse-confirmed / 1 never-run (`C7`, self-contradictory — read
before use). `B11` ships but is not yet written up in `DETECTION_QUERIES.md`.

`validate.py` batch-checks query syntax.
