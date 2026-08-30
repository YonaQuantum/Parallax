#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$ROOT_DIR/.tools/node/bin:$PATH"
export npm_config_cache="$ROOT_DIR/.cache/npm"

echo "PARALLAX 本地开发环境已启用"
echo "node: $(node -v)"
echo "npm:  $(npm -v)"
