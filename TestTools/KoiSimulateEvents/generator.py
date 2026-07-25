"""KOI event generator — faithful to the custom integration's koi_koi_raw schema.

Modelled field-for-field on real rows pulled from the tenant on 2026-07-25, so the
simulated stream exercises the same code paths as production data:

  * Alerts are OCSF "Application Security Posture Finding" (class_uid 2007) with the
    four blobs the pack reads: finding_info, observables, resources, metadata.
  * Every logical alert is RE-SENT n times under one notification_event_id, which is
    the duplication the dedupe fix exists for (measured ~709x on the real tenant).
  * marketplace values use KOI's SHORT event vocabulary (software_windows, chrome,
    vsc, huggingface, built_in ...), which is what the marketplace_api map converts.
  * risk_level uses KOI's real LOWERCASE ladder (critical/high/medium/low/pending).
  * Some items carry item.version = "" — the empty-string trap that makes a
    `!= null` test a false pass.

Pure functions, no I/O, so the shapes can be asserted locally before anything is sent.
"""
import json

CLASS = ("Application Security Posture Finding", 2007.0, "Findings", 2.0, 200701.0)

SEV_BY_RISK = {          # risk_level -> (severity, severity_id) — 1:1 on real data
    "critical": ("Critical", 5.0),
    "high":     ("High", 4.0),
    "medium":   ("Medium", 3.0),
    "low":      ("Low", 2.0),
    "pending":  ("Informational", 1.0),
}

# (short event value, API value or None when the API has no equivalent)
MARKETPLACES = [
    ("software_windows", "windows"),
    ("chrome",           "chrome_web_store"),
    ("software_mac",     "mac"),
    ("vsc",              "vscode"),
    ("npm",              "npm"),
    ("pypi",             "pypi"),
    ("github",           "github_mcp_registry"),
    ("huggingface",      "hugging_face"),   # our tenant has this; the source map missed it
    ("built_in",         None),             # installation_method leaking in -> must map to null
    ("side_loaded",      None),
    ("ollama",           None),
]

# Real KOI finding ids, risk 9-10 — hunt H2.1 filters on exactly these.
COMPROMISE_FINDINGS = [
    "AssociatedwithMaliciousCampaign", "RansomwareBehaviorDetected", "SpywareActivity",
    "ExfilsCloudandRemoteAccessSecrets", "Typosquatting", "PromptInjectionDetected",
]
BENIGN_FINDINGS = ["OverPrivilegedPermissions", "OutdatedDependency", "WeakSigning"]

RISKS = ["critical", "high", "medium", "low", "pending"]
ITEM_TYPES = ["extension", "package", "mcp_server", "software"]


def _obs(name, value):
    return {"name": name, "value": value, "type": "Other", "type_id": 99}


def make_alert(i, notification_id, host, user, device_id, seq=0, now_ms=0):
    """One ALERT occurrence. Re-sending the same notification_id with a different
    `seq` is what a duplicate fetch looks like: identical _time and payload,
    different arrival."""
    risk = RISKS[i % len(RISKS)]
    sev, sev_id = SEV_BY_RISK[risk]
    mk_short, _ = MARKETPLACES[i % len(MARKETPLACES)]
    itype = ITEM_TYPES[i % len(ITEM_TYPES)]
    item_id = "sim-item-%04d" % i
    # every 5th item ships the empty-string version trap
    version = "" if i % 5 == 0 else "%d.%d.%d" % (i % 9, i % 7, i % 5)
    findings = ([{"finding_id": COMPROMISE_FINDINGS[i % len(COMPROMISE_FINDINGS)],
                  "finding_name": "Simulated compromise-grade finding",
                  "severity": "critical", "risk": 10}]
                if risk in ("critical", "high")
                else [{"finding_id": BENIGN_FINDINGS[i % len(BENIGN_FINDINGS)],
                       "finding_name": "Simulated hygiene finding",
                       "severity": risk, "risk": 3}])
    created = now_ms - (i * 60_000)

    observables = [
        _obs("event.id", "sim-scanbatch-%03d" % (i // 13)),   # batch id: shared by ~13 alerts
        _obs("device.os", ["windows", "mac", "linux"][i % 3]),
        _obs("device.serial", "SIM-SERIAL-%04d" % i),
        _obs("item.id", item_id),
        _obs("item.version", version),
        _obs("item.type", itype),
        _obs("item.marketplace", mk_short),
    ]
    item_res = {
        "uid": "%s-%s" % (item_id, version or "none"), "name": "Simulated Item %04d" % i,
        "type": "item" if itype != "mcp_server" else "mcp",
        "version": version, "labels": ["simulated"],
        "criticality": risk,
        "data": {
            "item_id": item_id, "package_name": "sim-package-%04d" % i,
            "item_display_name": "Simulated Item %04d" % i, "version": version,
            # NOTE: the item RESOURCE carries the API long form while the observable
            # carries the short form — this is KOI's own dual vocabulary, and it is the
            # evidence the marketplace map reproduces.
            "marketplace": MARKETPLACES[i % len(MARKETPLACES)][1] or mk_short,
            "risk": {"critical": 10, "high": 8, "medium": 5, "low": 2, "pending": 0}[risk],
            "risk_level": risk,
            "findings": {"findings": findings},
        },
    }
    if itype == "mcp_server":
        item_res["data"].update({"mcp_id": 9000 + i, "mcp_type": "local",
                                 "transport": "stdio", "risk_status": "assessed",
                                 "package_type": "npm", "installation_method": "cli",
                                 "url": "https://sim.local/mcp/%04d" % i})
    device_res = {
        "uid": device_id, "name": host, "type": "device", "criticality": "medium",
        "data": {"id": device_id, "hostname": host, "last_seen": created,
                 "last_logged_on_user": user, "status": "active",
                 "registered_at": created - 86_400_000, "network_user": user},
    }
    return {
        "source_log_type": "Alerts",
        "class_name": CLASS[0], "class_uid": CLASS[1],
        "category_name": CLASS[2], "category_uid": CLASS[3], "type_uid": CLASS[4],
        "activity_name": "Create", "activity_id": 1.0,
        "severity": sev, "severity_id": sev_id,
        "confidence": "High", "confidence_id": 3.0,
        "status": "New", "status_id": 1.0,
        "is_alert": True,
        "time": float(created), "timezone_offset": 0.0,
        "risk_level": risk,
        "risk_score": item_res["data"]["risk"],
        "message": "Simulated KOI alert on '%s' for 'Simulated Item %04d'" % (host, i),
        "finding_info": {"uid": "sim-policy-%d" % (i % 3),          # policy id: ~1/3 of alerts
                         "title": "Simulated Policy %d" % (i % 3),
                         "created_time": created,
                         "types": ["policy_violation"]},            # the only live value
        "observables": observables,
        "resources": [item_res, device_res],
        "metadata": {"notification_event_id": notification_id,
                     "version": "1.0.0", "product": {"name": "Koi", "vendor_name": "Koi"}},
        "_sim_seq": seq,
    }


def make_audit(i, host, user, now_ms=0):
    """One AUDIT row. Audit is point-in-time and NOT duplicated (1.0x on real data)."""
    mk_short, _ = MARKETPLACES[i % len(MARKETPLACES)]
    atype = ["extensions", "devices", "remediation", "policies", "approval_requests"][i % 5]
    action = {"extensions": "installed", "devices": "registered", "remediation": "remediated",
              "policies": "updated", "approval_requests": None}[atype]
    created = now_ms - (i * 45_000)
    ev = {
        "source_log_type": "Audit",
        "created_at": created,
        "type": atype,
        "action": action,
        "object_id": "sim-item-%04d" % i,
        "object_name": "sim-package-%04d" % i,
        "object_type": "item",
        "hostname": host, "endpoint": host,
        "triggered_by": "Koi",
        "item_version": "%d.%d" % (i % 9, i % 7),
        "marketplace": mk_short,
        "platform": ["win", "mac", "lin"][i % 3],
        "category": "system",
        "id": "sim-audit-%06d" % i,
    }
    if atype == "approval_requests":
        # approval rows carry action=null and hide the lifecycle in free text — the
        # gateway parsing columns exist to dig it back out
        ev["message"] = ("%s requested access to 'sim-package-%04d' [risk: %s] — %s"
                         % (user, i, RISKS[i % len(RISKS)],
                            ["submitted", "approved", "rejected"][i % 3]))
    else:
        ev["message"] = ("'sim-package-%04d' %s on %s" % (i, action, host))
    return ev


def generate(n_alerts=40, dup_factor=8, n_audit=60, now_ms=0):
    """Returns (events, expected) — expected carries the ground truth the validation
    queries must reproduce, so the test asserts against arithmetic rather than vibes."""
    hosts = ["sim-win-01", "sim-mac-02", "sim-lin-03", "sim-win-04"]
    users = ["alice", "bob", "carol", "dave"]
    events, notifications = [], []
    for i in range(n_alerts):
        nid = "sim-notif-%s-%04d" % (str(now_ms)[-6:], i)
        notifications.append(nid)
        for seq in range(dup_factor):                # the re-send: same alert, many rows
            events.append(make_alert(i, nid, hosts[i % 4], users[i % 4],
                                     "sim-device-%02d" % (i % 4), seq, now_ms))
    for i in range(n_audit):
        events.append(make_audit(i, hosts[i % 4], users[i % 4], now_ms))

    mk_counts = {}
    for i in range(n_alerts):
        mk_counts[MARKETPLACES[i % len(MARKETPLACES)][0]] = \
            mk_counts.get(MARKETPLACES[i % len(MARKETPLACES)][0], 0) + 1
    expected = {
        "alert_rows": n_alerts * dup_factor,
        "distinct_alerts": n_alerts,
        "dup_factor": dup_factor,
        "audit_rows": n_audit,
        "distinct_scan_batches": len({i // 13 for i in range(n_alerts)}),
        "distinct_policies": len({i % 3 for i in range(n_alerts)}),
        "risk_mix": {r: sum(1 for i in range(n_alerts) if RISKS[i % len(RISKS)] == r) for r in RISKS},
        "empty_version_alerts": sum(1 for i in range(n_alerts) if i % 5 == 0),
        "unmappable_marketplace_alerts": sum(
            1 for i in range(n_alerts) if MARKETPLACES[i % len(MARKETPLACES)][1] is None),
        "notifications": notifications,
    }
    return events, expected
