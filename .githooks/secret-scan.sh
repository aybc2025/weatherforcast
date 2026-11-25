#!/usr/bin/env bash
# secret-scan.sh            -> staged changes (pre-commit)
# secret-scan.sh --all      -> all tracked files + full history (run before the first push)
set -u
fail=0
BAD_FILES='(^|/)(\.env(\..*)?|[^/]*\.(pem|key|p12|pfx)|id_rsa[^/]*|[^/]*(serviceAccount|service-account|credentials)[^/]*\.json)$'
ALLOW_FILES='(^|/)\.env\.(example|sample|template)$'
PATTERNS="-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|xox[baprs]-[A-Za-z0-9-]{10,}|nfp_[A-Za-z0-9]{30,}|\"private_key\"[[:space:]]*:|(secret|token|passw(or)?d|api_?key)[A-Za-z_]*[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9+/_=-]{20,}[\"']"
if [ "${1:-}" = "--all" ]; then
  files=$(git ls-files); diff=$(git log -p --all --no-color 2>/dev/null)
else
  files=$(git diff --cached --name-only --diff-filter=ACM)
  diff=$(git diff --cached --no-color -U0)
fi
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if echo "$f" | grep -Eq "$BAD_FILES" && ! echo "$f" | grep -Eq "$ALLOW_FILES"; then
    echo "secret-scan: sensitive file staged: $f"; fail=1
  fi
done <<< "$files"
hits=$(echo "$diff" | grep -E '^\+[^+]' | grep -v 'secret-scan:allow' | grep -iE -e "$PATTERNS" | cut -c1-60)
if [ -n "$hits" ]; then
  echo "secret-scan: possible secret in added lines (truncated):"; echo "$hits"; fail=1
fi
[ "$fail" -eq 1 ] && echo "Commit blocked. Remove the secret and use an environment variable."
exit $fail
