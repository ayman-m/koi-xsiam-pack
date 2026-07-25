# KoiSimulateEvents — KOI event simulator

Test-only tooling. Generates simulated KOI events matching this pack's `koi_koi_raw`
schema and ships them to a dataset, so the parsing rule, the XQL query library, the
dashboard and the triage logic can be exercised on demand instead of waiting for real
KOI activity — and, more importantly, against **known ground truth**.

| File | What it is |
|---|---|
| `generator.py` | The pure generator. No I/O, so shapes can be asserted locally. |
| `automation-KoiSimulateEvents.yml` | The same generator plus a sender, packaged as an XSOAR automation. Self-contained — a raw pack upload skips demisto-sdk's prepare-content, so `CommonServerPython` is unavailable and `send_events_to_xsiam` cannot be imported; the sender reproduces its wire contract (gzipped NDJSON to `/logs/v1/xsiam`) and reads the collector token from the licence fields, so the token never leaves the tenant. |

## It writes to `koisim_koisim_raw`, not `koi_koi_raw`

Deliberate. The dataset is `<vendor>_<product>_raw` and both default to `koisim`, so the
real dataset is never polluted — it is shared with a second KOI project on this tenant
whose measurements would be corrupted by injected rows. Override `vendor`/`product` only
if you genuinely want simulated rows in the real dataset.

## What it deliberately reproduces

Modelled field-for-field on real rows pulled from the tenant on 2026-07-25:

- **Alerts** as OCSF *Application Security Posture Finding* (`class_uid` 2007) carrying
  the four blobs the pack reads: `finding_info`, `observables`, `resources`, `metadata`.
- **The re-send.** Each logical alert is emitted `duplicate_factor` times under one
  `notification_event_id`. This is the amplification the dedupe work exists for
  (~709x measured on the real tenant).
- **Short-form marketplace values** (`software_windows`, `chrome`, `vsc`, `huggingface`,
  `built_in`, `side_loaded`, `ollama`) — the event vocabulary the API rejects.
- **The dual vocabulary**: the observable carries the short form while the item resource
  carries the API long form, on the same row. That is KOI's own behaviour and it is the
  evidence the mapping table reproduces.
- **Lowercase `risk_level`** (`critical`/`high`/`medium`/`low`/`pending`) and
  `alert_type` = `policy_violation` only — the real vocabulary, which is what made the
  old verdict matrix unreachable.
- **`item.version` = `""`** on every fifth item — the empty-string trap that makes a
  "not null" test a false pass.
- **Audit rows** including `approval_requests`, which carry `action = null` and hide the
  lifecycle in free text.

## Ground truth

`generate()` returns `(events, expected)`. `expected` carries the arithmetic a
validating query must reproduce — distinct alerts, rows, risk mix, empty-version count,
unmappable-marketplace count — so tests assert against numbers rather than impressions.

## Usage

```
!KoiSimulateEvents alerts=40 duplicate_factor=8 audit=60
```

Then query `koisim_koisim_raw`. To exercise the library or dashboard against it,
substitute the dataset name.

## Known limit

A parsing rule targeting the simulation dataset did **not** activate from a raw pack
upload, even with the rules inlined into the YAML — so simulated rows carry only raw
event fields, and anything reading a parsing-rule-promoted column cannot be tested this
way. The rule logic itself is verifiable by running its expressions inline in XQL, which
is how this pack's parsing rule has always been validated.
