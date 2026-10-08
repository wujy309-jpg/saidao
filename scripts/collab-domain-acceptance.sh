#!/usr/bin/env bash
set -euo pipefail

# Required environment: OWNER_TOKEN, DEVELOPER_TOKEN, VISITOR_TOKEN,
# NON_MEMBER_TOKEN, REPO_ID, BRANCH, FILE_PATH.
BASE="${BASE:-http://127.0.0.1:8080/api}"
: "${OWNER_TOKEN:?set OWNER_TOKEN}"
: "${DEVELOPER_TOKEN:?set DEVELOPER_TOKEN}"
: "${VISITOR_TOKEN:?set VISITOR_TOKEN}"
: "${NON_MEMBER_TOKEN:?set NON_MEMBER_TOKEN}"
: "${REPO_ID:?set REPO_ID}"
: "${BRANCH:?set BRANCH}"
: "${FILE_PATH:?set FILE_PATH}"

status_code() {
  local token="$1" method="$2" url="$3"
  shift 3
  curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$url" \
    -H "Authorization: Bearer $token" "$@"
}

assert_code() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$expected" != "$actual" ]]; then
    printf 'FAIL %-35s expected=%s actual=%s\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
  printf 'PASS %-35s %s\n' "$label" "$actual"
}

REPO_URL="$BASE/code-repos/$REPO_ID"
assert_code 200 "$(status_code "$OWNER_TOKEN" GET "$REPO_URL")" 'owner read repo'
assert_code 200 "$(status_code "$DEVELOPER_TOKEN" GET "$REPO_URL/files?branch=$(printf '%s' "$BRANCH" | sed 's/ /%20/g')")" 'developer read files'
assert_code 200 "$(status_code "$VISITOR_TOKEN" GET "$REPO_URL/files?branch=$(printf '%s' "$BRANCH" | sed 's/ /%20/g')")" 'visitor read files'
assert_code 403 "$(status_code "$VISITOR_TOKEN" POST "$REPO_URL/commits" -H 'Content-Type: application/json' --data '{"message":"forbidden","files":[]}')" 'visitor write commit'
assert_code 403 "$(status_code "$DEVELOPER_TOKEN" POST "$REPO_URL/members" -H 'Content-Type: application/json' --data '{"userId":1,"role":"REPORTER"}')" 'developer manage members'
assert_code 403 "$(status_code "$DEVELOPER_TOKEN" PUT "$REPO_URL/members/1/role" -H 'Content-Type: application/json' --data '{"role":"OWNER"}')" 'developer self privilege escalation'
assert_code 403 "$(status_code "$NON_MEMBER_TOKEN" GET "$REPO_URL/commits")" 'non member read commits'
assert_code 403 "$(status_code "$NON_MEMBER_TOKEN" GET "$REPO_URL/files?branch=$(printf '%s' "$BRANCH" | sed 's/ /%20/g')")" 'non member read files'
assert_code 403 "$(status_code "$NON_MEMBER_TOKEN" GET "$REPO_URL/files/download?branch=$(printf '%s' "$BRANCH" | sed 's/ /%20/g')&path=$(printf '%s' "$FILE_PATH" | sed 's/ /%20/g')")" 'non member download file'

TRAVERSAL_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' --get "$REPO_URL/files" \
  -H "Authorization: Bearer $DEVELOPER_TOKEN" \
  --data-urlencode 'branch=../../static' --data-urlencode 'path=../../app/static/x')
assert_code 400 "$TRAVERSAL_STATUS" 'branch and path traversal'

if [[ -n "${OWNER_ID:-}" ]]; then
  TAKEOVER_JSON=$(curl -sS -X POST "$BASE/code-repos" \
    -H "Authorization: Bearer $OWNER_TOKEN" -H 'Content-Type: application/json' \
    --data "{\"name\":\"acceptance-owner-check\",\"ownerId\":999999999,\"visibility\":\"PRIVATE\"}")
  ACTUAL_OWNER=$(printf '%s' "$TAKEOVER_JSON" | jq -r '.data.owner.id')
  if [[ "$ACTUAL_OWNER" != "$OWNER_ID" ]]; then
    printf 'FAIL owner takeover protection expected=%s actual=%s\n' "$OWNER_ID" "$ACTUAL_OWNER" >&2
    exit 1
  fi
  CREATED_REPO=$(printf '%s' "$TAKEOVER_JSON" | jq -r '.data.id')
  curl -sS -X DELETE "$BASE/code-repos/$CREATED_REPO" -H "Authorization: Bearer $OWNER_TOKEN" >/dev/null
  printf 'PASS %-35s owner=%s\n' 'owner takeover protection' "$ACTUAL_OWNER"
fi

printf 'Acceptance matrix completed.\n'
