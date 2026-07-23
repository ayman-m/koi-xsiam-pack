#!/usr/bin/env bash
# Standalone Cortex API key verifier — read-only, single call.
# Usage:  ./verify_tenant_key.sh <api-url> <auth-id> <api-key>
# Example: ./verify_tenant_key.sh https://api-transmed.xdr.pl.paloaltonetworks.com 103 'PASTE_KEY'
set -euo pipefail
URL="${1:?api url}"; AID="${2:?auth id}"; KEY="${3:?api key}"

TS=$(python3 -c 'import time;print(int(time.time()*1000))')
NONCE=$(python3 -c 'import secrets;print(secrets.token_hex(32))')
SIG=$(printf '%s%s%s' "$KEY" "$NONCE" "$TS" | shasum -a 256 | cut -d' ' -f1)

echo "URL     : $URL"
echo "Auth ID : $AID"
echo "Key len : ${#KEY}"
echo "Egress  : $(curl -s --max-time 10 https://api.ipify.org || echo unknown)"
echo

echo "--- ADVANCED (signed) ---"
curl -s -o /tmp/_adv.txt -w "HTTP %{http_code}\n" --max-time 30 -X POST \
  -H "x-xdr-timestamp: $TS" -H "x-xdr-nonce: $NONCE" -H "x-xdr-auth-id: $AID" \
  -H "Authorization: $SIG" -H "Content-Type: application/json" \
  -d '{"request_data":{"search_from":0,"search_to":1}}' \
  "$URL/public_api/v1/endpoints/get_endpoint/"
head -c 200 /tmp/_adv.txt; echo; echo

echo "--- STANDARD (key as-is) ---"
curl -s -o /tmp/_std.txt -w "HTTP %{http_code}\n" --max-time 30 -X POST \
  -H "x-xdr-auth-id: $AID" -H "Authorization: $KEY" -H "Content-Type: application/json" \
  -d '{"request_data":{"search_from":0,"search_to":1}}' \
  "$URL/public_api/v1/endpoints/get_endpoint/"
head -c 200 /tmp/_std.txt; echo
rm -f /tmp/_adv.txt /tmp/_std.txt
echo
echo "HTTP 200 = working.  401 = key/ID/IP rejected by the tenant."
