#!/usr/bin/env bash
# Verify the Script Runner / scan-coverage feature is identical in both KOI repos.
#
# The feature calls no koi-* command — only core-get-scripts, core-get-endpoints,
# core-script-run and core-api-post — so it has NO dependency on either integration and
# there is no legitimate reason for the two copies to diverge. The only permitted
# difference is the playbook name: both packs land on the same tenant and XSOAR keys
# playbooks by id, so identical ids would make one pack silently overwrite the other's.
#
#   custom repo :  "KOI Script Runner - <X>"
#   marketplace :  "KOI Ext Script Runner - <X>"
#
# Exits non-zero on any other difference.
#
# Usage:  ./TestTools/check_scan_feature_sync.sh [path-to-marketplace-repo]

set -uo pipefail

CUS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MP_ROOT="${1:-$HOME/Documents/Coding/koi-mp-work}"
MP="$MP_ROOT/Packs/KoiContentExtension"

if [ ! -d "$MP" ]; then
  echo "marketplace pack not found at: $MP"
  echo "pass its repo root as the first argument"
  exit 2
fi

PLAYBOOKS=(Scan_Job Process_Config_Entry Execute_Endpoint_Script Refresh_Job Refresh_Entry)
drift=0

echo "Scan-feature sync check"
echo "  custom      : $CUS"
echo "  marketplace : $MP"
echo

for pb in "${PLAYBOOKS[@]}"; do
  a="$CUS/Playbooks/playbook-KOI_Script_Runner_-_${pb}.yml"
  b="$MP/Playbooks/playbook-KOI_Ext_Script_Runner_-_${pb}.yml"
  if [ ! -f "$a" ] || [ ! -f "$b" ]; then
    printf "  MISSING  %s\n" "$pb"; drift=1; continue
  fi
  # normalise the naming convention, then compare everything else
  d=$(diff <(sed 's/KOI Ext Script Runner - /KOI Script Runner - /g' "$b") "$a" || true)
  if [ -n "$d" ]; then
    printf "  DRIFT    %s\n" "$pb"
    echo "$d" | sed 's/^/             /'
    drift=1
  else
    printf "  ok       %s\n" "$pb"
  fi
done

# the automation is shared verbatim — no name substitution applies
for f in KoiScanTracker.py KoiScanTracker.yml; do
  d=$(diff "$MP/Scripts/KoiScanTracker/$f" "$CUS/Scripts/KoiScanTracker/$f" || true)
  if [ -n "$d" ]; then
    printf "  DRIFT    %s\n" "$f"; echo "$d" | sed 's/^/             /'; drift=1
  else
    printf "  ok       %s\n" "$f"
  fi
done

# ---- the pasteable List sample must match the shipped content item ----
python3 - "$CUS" "$MP" <<'PYEOF'
import json, sys
bad = 0
for root in sys.argv[1:]:
    item = json.load(open(f"{root}/Lists/list-Koi_Script_Runner.json"))["data"]
    md   = open(f"{root}/Lists/README.md").read()
    block = md.split("```json\n", 1)[1].split("\n```", 1)[0]
    if block != item:
        print(f"  DRIFT    Lists/README.md block != list-Koi_Script_Runner.json data  ({root})")
        bad = 1
    elif "\\n" in block:
        print(f"  DRIFT    Lists/README.md block contains escaped newlines  ({root})")
        bad = 1
    else:
        print(f"  ok       Lists sample matches the content item  ({root.split('/')[-1] or 'custom'})")
sys.exit(bad)
PYEOF
[ $? -ne 0 ] && drift=1

# ---- the prepared single-file automation must match its source ----
python3 "$CUS/TestTools/prepare_koiscantracker.py" --check || drift=1

# ---- every path a guide prints must exist in that guide's own repo ----
# The two packs sit at different depths: the custom pack IS its repo root, while the
# marketplace pack lives under Packs/KoiContentExtension/ as a contribution has to. A
# path copied between the two decks therefore resolves in one repo and not the other,
# which is invisible until a reader goes looking for the file on GitHub.
python3 - "$CUS" "$MP_ROOT" <<'PYEOF'
import os, re, sys
bad = 0
for root, deck in ((sys.argv[1], "custom"), (sys.argv[2], "marketplace")):
    js = os.path.join(root, "docs", "build_test_guide.js")
    if not os.path.exists(js):
        continue
    text = open(js).read()
    paths = set(re.findall(
        r'\b((?:Packs/[A-Za-z0-9_]+/)?(?:dist|Lists|Scripts|TestTools|Playbooks)/[A-Za-z0-9_\-./]+\.(?:yml|json|md|py))',
        text))
    missing = sorted(p for p in paths if not os.path.exists(os.path.join(root, p)))
    for p in missing:
        print(f"  DRIFT    {deck} guide prints a path that does not exist there: {p}")
        bad = 1
    if not missing:
        print(f"  ok       {deck} guide: all {len(paths)} printed paths resolve")
sys.exit(bad)
PYEOF
[ $? -ne 0 ] && drift=1

echo
if [ "$drift" -eq 0 ]; then
  echo "In sync — the two copies differ only by playbook name."
else
  echo "OUT OF SYNC. Port the change to the other repo before releasing either."
  echo "Reminder: the marketplace copy renames 'KOI Script Runner - X' to 'KOI Ext Script Runner - X';"
  echo "the KoiScanTracker automation and the 'Koi Script Runner' List name stay identical."
fi
exit "$drift"
