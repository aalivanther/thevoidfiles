#!/bin/bash
set -euo pipefail

project_root_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing_tool_names=()

for required_tool_name in uv node pnpm; do
  if ! command -v "$required_tool_name" >/dev/null 2>&1; then
    missing_tool_names+=("$required_tool_name")
  fi
done

if [ "${#missing_tool_names[@]}" -gt 0 ]; then
  echo "missing_required_tools: ${missing_tool_names[*]}" >&2
  echo "install_hint: brew install uv node pnpm" >&2
  exit 1
fi

cd "$project_root_directory"
uv sync --python 3.14
mkdir -p "$project_root_directory/data"

cd "$project_root_directory/frontend"
pnpm install --frozen-lockfile
pnpm build

echo "setup_finished"
