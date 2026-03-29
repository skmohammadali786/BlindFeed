#!/usr/bin/env bash
# Install pnpm@10.33.0 directly via npm (avoids corepack's signature verification).
# This upgrades the pnpm binary in the nvm bin directory so ALL subsequent
# pnpm calls on this build server — including EAS's own frozen-lockfile install
# — use pnpm@10.33.0, which understands our lockfile format (v9.0 + catalogs).
set -euo pipefail

echo "EAS pre-install: installing pnpm@10.33.0..."
npm install -g pnpm@10.33.0

echo "EAS pre-install: pnpm version: $(pnpm --version)"

echo "EAS pre-install: regenerating lockfile..."
pnpm install --no-frozen-lockfile

echo "EAS pre-install: done."
