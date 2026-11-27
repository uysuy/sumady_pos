#!/usr/bin/env bash
# TRACKED TEMPLATE for Hostinger POS demo (pos.25nov.tech).
# Host-local script is gitignored — copy once on the server:
#   cp deploy.sumady-pos.example.sh deploy.sh && chmod +x deploy.sh
#
# Expect:
#   Path /opt/sumady-pos          | branch main
#   PM2 sumady-pos-web :4003      | Nginx server_name pos.25nov.tech
#
# Usage:
#   bash /opt/sumady-pos/deploy.sh

if [ -z "${BASH_VERSION:-}" ]; then
	echo "[deploy ERROR] run with: bash $0  (not sh)" >&2
	exit 1
fi

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
WEB_DIR="$ROOT/pos-web"
PM2_NAME="${DEPLOY_PM2_WEB:-sumady-pos-web}"
WEB_PORT="${DEPLOY_WEB_PORT:-4003}"
WEB_HOST="${DEPLOY_WEB_HOST:-127.0.0.1}"

log() { echo "[deploy $(date '+%H:%M:%S')] $*"; }
die() { echo "[deploy ERROR] $*" >&2; exit 1; }

cd "$ROOT"
log "root=$ROOT branch=$BRANCH pm2=$PM2_NAME :$WEB_PORT"

command -v git >/dev/null || die "git not found"
command -v npm >/dev/null || die "npm not found"
command -v pm2 >/dev/null || die "pm2 not found"

log "git fetch + hard reset to origin/$BRANCH"
git fetch origin "$BRANCH" || die "git fetch failed"
git reset --hard HEAD 2>/dev/null || true
git clean -fd
git checkout -B "$BRANCH" "origin/$BRANCH" || die "git checkout failed"
git reset --hard "origin/$BRANCH" || die "git reset failed"
log "HEAD=$(git log -1 --oneline)"

[[ -d "$WEB_DIR" ]] || die "missing $WEB_DIR"
cd "$WEB_DIR"

# PayWay secrets — keep on server only (never in git). See .env.example.
if [[ ! -f .env ]]; then
	log "creating pos-web/.env from .env.example — fill PAYWAY_* before testing KHQR"
	cp .env.example .env
	log "WARN: edit $WEB_DIR/.env (PAYWAY_MERCHANT_ID, PAYWAY_API_KEY, PAYWAY_BASE_URL)"
elif ! grep -qE '^PAYWAY_MERCHANT_ID=.+' .env || ! grep -qE '^PAYWAY_API_KEY=.+' .env; then
	log "WARN: PAYWAY_MERCHANT_ID / PAYWAY_API_KEY look empty — KHQR will stay in demo mode"
fi

log "npm ci + build"
npm ci || die "npm ci failed"
NODE_OPTIONS=--max-old-space-size=4096 npm run build || die "npm run build failed"
[[ -f "$WEB_DIR/build/index.js" ]] || die "missing build/index.js — adapter-node build failed"

export NODE_ENV=production
export HOST="$WEB_HOST"
export PORT="$WEB_PORT"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
	log "pm2 restart $PM2_NAME"
	pm2 restart "$PM2_NAME" --update-env || die "pm2 restart failed"
else
	log "pm2 start ecosystem.config.cjs ($PM2_NAME)"
	pm2 start ecosystem.config.cjs || die "pm2 start failed"
fi
pm2 save

wait_port() {
	local port="$1" tries="${2:-30}"
	local i
	for i in $(seq 1 "$tries"); do
		if ss -lntp 2>/dev/null | grep -E ":$port" >/dev/null; then
			return 0
		fi
		sleep 1
	done
	pm2 logs "$PM2_NAME" --lines 40 --nostream 2>/dev/null || true
	return 1
}

wait_port "$WEB_PORT" 30 || die "web not listening on :$WEB_PORT"
log "OK curl -sI http://127.0.0.1:$WEB_PORT/ | head -3"
curl -sI "http://127.0.0.1:${WEB_PORT}/" | head -3 || true
log "smoke: curl -sI https://pos.25nov.tech/ | head -3"
log "DONE HEAD=$(git -C "$ROOT" log -1 --oneline)"
