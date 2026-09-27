#!/usr/bin/env bash
# Redeploy Kuromi Clicker to GitHub Pages.
# Bumps the service-worker cache version (so installed copies show "New version — tap to refresh"),
# commits everything and pushes. GitHub Pages rebuilds in about a minute.
#
#   ./deploy.sh "what changed"
set -euo pipefail
cd "$(dirname "$0")"

msg="${1:-Update}"
cur=$(sed -nE "s/^const CACHE_VERSION = 'kuromi-v([0-9]+)';/\1/p" sw.js)
if [ -z "$cur" ]; then echo "Couldn't find CACHE_VERSION in sw.js" >&2; exit 1; fi
next=$((cur + 1))
sed -i.bak -E "s/^const CACHE_VERSION = 'kuromi-v[0-9]+';/const CACHE_VERSION = 'kuromi-v${next}';/" sw.js
rm -f sw.js.bak

git add -A
git commit -q -m "${msg} (cache kuromi-v${next})"
git push -q
echo "Pushed kuromi-v${next}. Live in about a minute at https://rubio881.github.io/kuromi-clicker/"
