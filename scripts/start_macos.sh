#!/bin/bash
set -euo pipefail

project_root_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "missing_required_tools: uv" >&2
  exit 1
fi

if [ ! -d "$project_root_directory/.venv" ]; then
  echo "environment_missing: run scripts/setup_macos.sh first" >&2
  exit 1
fi

mkdir -p "$project_root_directory/data"

provider_mode_name="${THE_VOID_FILES_PROVIDER_MODE:-synthetic}"
if [ "$provider_mode_name" != "synthetic" ] && [ "$provider_mode_name" != "real" ]; then
  echo "unknown_provider_mode: $provider_mode_name" >&2
  exit 1
fi

export THE_VOID_FILES_PROVIDER_MODE="$provider_mode_name"
if [ "$provider_mode_name" = "real" ]; then
  export THE_VOID_FILES_CASE_MATERIAL_SOURCE="generated"
  story_provider_name="${THE_VOID_FILES_STORY_PROVIDER_NAME:-deepseek}"
  if [ "$story_provider_name" != "gemini" ] && [ "$story_provider_name" != "deepseek" ] && [ "$story_provider_name" != "openai" ] && [ "$story_provider_name" != "groq" ]; then
    echo "unknown_story_provider_name: $story_provider_name" >&2
    exit 1
  fi
  export THE_VOID_FILES_STORY_PROVIDER_NAME="$story_provider_name"
else
  export THE_VOID_FILES_CASE_MATERIAL_SOURCE="curated"
fi

echo "provider_mode: $THE_VOID_FILES_PROVIDER_MODE"
if [ "$provider_mode_name" = "real" ]; then
  echo "story_provider_name: $THE_VOID_FILES_STORY_PROVIDER_NAME"
fi

cd "$project_root_directory"
exec uv run --no-sync uvicorn the_void_files.service_entry_point:application \
  --app-dir "$project_root_directory/src" \
  --host 127.0.0.1 \
  --port 8765
