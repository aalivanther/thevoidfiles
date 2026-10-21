# The Void Files

A local game of investigation, secrecy and cosmic horror: an Investigator opens a File from a Whisper and survives it, or not.
An AI Director narrates and a Python service confirms every consequence; the interface is in Spanish.
Demo (simulated run, no AI): https://akyrion.tech/thevoidfiles/

## Run locally

1. macOS with Python 3.14, uv and pnpm.
2. `scripts/setup_macos.sh` once, to install and build the frontend.
3. `scripts/start_macos.sh`, then open http://127.0.0.1:8765.
4. Without keys it plays the curated lighthouse case; `THE_VOID_FILES_PROVIDER_MODE=real` uses the AI providers set in Settings.
5. Tests: `uv run pytest tests -q` and `cd frontend && pnpm test`.
