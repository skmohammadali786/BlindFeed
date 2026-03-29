#!/usr/bin/env bash
# Force the pnpm version declared in packageManager to be used for this build.
# corepack enable creates a shim so all subsequent pnpm calls (including
# EAS's own "pnpm install --frozen-lockfile") use pnpm@10.33.0, which can
# read our lockfile format (v9.0 + catalogs) without the LOCKFILE_CONFIG_MISMATCH error.
set -euo pipefail

echo "EAS pre-install: activating pnpm@10.33.0 via corepack..."
corepack enable pnpm
corepack prepare pnpm@10.33.0 --activate

echo "EAS pre-install: regenerating lockfile with pnpm@10.33.0..."
pnpm install --no-frozen-lockfile

echo "EAS pre-install: done."
