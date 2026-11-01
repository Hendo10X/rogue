#!/usr/bin/env bash
# Pulls master, builds, and restarts Rogue. Run on the server (GitHub Actions
# runs it on every push to master). The new build goes to .next-build first,
# so the live site keeps serving the old one until the quick swap at the end.
set -euo pipefail

APP=/opt/rogue
cd "$APP"

[ -f .env ] || { echo "Missing $APP/.env — see docs/deploy-oracle.md"; exit 1; }

git fetch --quiet origin master
git reset --hard --quiet origin/master

npm ci --no-audit --no-fund
rm -rf .next-build
NEXT_DIST_DIR=.next-build npm run build

rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-build .next
sudo systemctl restart rogue
rm -rf .next-old

echo "Deployed $(git rev-parse --short HEAD)"
