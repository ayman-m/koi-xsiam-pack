#!/usr/bin/env bash
# Verify the Script Runner / scan-coverage feature is identical in both KOI repos.
#
# The feature calls no koi-* command — only core-get-scripts, core-get-endpoints,
# core-script-run and core-api-post — so it has NO dependency on either integration and
# there is no legitimate reason for the two copies to diverge. The only permitted
# difference is the playbook name: both packs land on the same tenant and XSOAR keys
# playbooks by id, so identical ids would make one pack silently overwrite the other's.
#
#   custom repo :  "Koi Unified - <X>"
#   marketplace :  "KOI Ext - Unified <X>"
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

PLAYBOOKS=(Script_Runner Process_Config_Entry Execute_Endpoint_Script Refresh_Tracker Refresh_Entry)
drift=0

echo "Scan-feature sync check"
echo "  custom      : $CUS"
echo "  marketplace : $MP"
echo

for pb in "${PLAYBOOKS[@]}"; do
  a="$CUS/Playbooks/playbook-Koi_Unified_-_${pb}.yml"
  b="$MP/Playbooks/playbook-KOI_Ext_-_Unified_${pb}.yml"
  if [ ! -f "$a" ] || [ ! -f "$b" ]; then
    printf "  MISSING  %s\n" "$pb"; drift=1; continue
  fi
  # normalise the naming convention, then compare everything else
  d=$(diff <(sed 's/KOI Ext - Unified /Koi Unified - /g' "$b") "$a" || true)
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

echo
if [ "$drift" -eq 0 ]; then
  echo "In sync — the two copies differ only by playbook name."
else
  echo "OUT OF SYNC. Port the change to the other repo before releasing either."
  echo "Reminder: the marketplace copy renames 'Koi Unified - X' to 'KOI Ext - Unified X';"
  echo "the KoiScanTracker automation and the 'Koi Script Runner' List name stay identical."
fi
exit "$drift"
