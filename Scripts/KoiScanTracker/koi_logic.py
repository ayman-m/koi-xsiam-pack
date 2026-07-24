"""Pure logic for the KoiScanTracker automation — no demisto dependency, unit-testable."""
import io, csv, time

HEADER = ["endpoint_id", "last_scan"]   # minimal row: id + epoch seconds

def parse_tracker(text):
    """CSV text -> {endpoint_id: last_scan_epoch_int_or_0}. Tolerant of empty/missing/header."""
    rows = {}
    if not text or not text.strip():
        return rows
    for r in csv.reader(io.StringIO(text.strip())):
        if not r or not r[0].strip() or r[0].strip() == "endpoint_id":
            continue
        eid = r[0].strip()
        ls = 0
        if len(r) > 1 and r[1].strip():
            try:
                ls = int(float(r[1].strip()))
            except ValueError:
                ls = 0
        rows[eid] = ls
    return rows

def emit_tracker(rows):
    """{id: epoch} -> CSV text with header, id-sorted for stable diffs."""
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(HEADER)
    for eid in sorted(rows):
        w.writerow([eid, rows[eid]])
    return out.getvalue()

def upsert_members(rows, endpoint_ids):
    """Append-only: add new ids with last_scan=0 (=> immediately due). Never touch existing."""
    added = 0
    for eid in endpoint_ids:
        if eid not in rows:
            rows[eid] = 0
            added += 1
    return rows, added

def compute_due(rows, candidate_ids, interval_hours, now_epoch, max_n):
    """From candidate_ids (currently in group/connected), pick those due:
       not tracked, or last_scan older than interval. Stale-first, capped."""
    thresh = now_epoch - int(interval_hours) * 3600
    due = []
    for eid in candidate_ids:
        ls = rows.get(eid)
        if ls is None or ls == 0 or ls <= thresh:
            due.append((ls or 0, eid))
    due.sort()                      # oldest last_scan first (0 = never, sorts first)
    return [eid for _, eid in due[:max_n]]

def mark_scanned(rows, endpoint_ids, now_epoch):
    """mark-on-dispatch: set last_scan=now for the given ids (add if missing)."""
    for eid in endpoint_ids:
        rows[eid] = now_epoch
    return rows
