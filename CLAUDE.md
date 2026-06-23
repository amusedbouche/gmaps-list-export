# Maps List Extractor — Project Rules

## Folder structure
- `src/` — extension source: popup.html, popup.js, extractor.js
- `icons/` — extension icons (16, 48, 128px)
- `scripts/` — dev scripts and git hooks
- Root: manifest.json, README.md, TODO.md, DONE.md

## Git commits
- One commit per feature implementation
- Batch small changes (< ~30 lines) into a single commit
- Always run the pre-commit hook before pushing (installed via `git config core.hooksPath scripts`)

## Docs policy
- When a feature is completed, move it from TODO.md to DONE.md
- Update README.md if the user-facing behavior changes
- The pre-commit hook auto-stages README.md, TODO.md, and DONE.md if they have unsaved changes

## Allowed tools (.claude/settings.json)
- `Bash` — git, mkdir, chmod, ls
- `Read`, `Write`, `Edit` — file operations
- `Agent` — Haiku sub-agents for grunt work
- `mcp__Claude_in_Chrome__*` — inspect live page data (list_connected_browsers, tabs_context_mcp, javascript_tool)

## Extension notes
- `world: 'MAIN'` is required in executeScript — content scripts cannot access window.APP_INITIALIZATION_STATE
- Find the LARGEST XSSI string (starts with `)]}'`) in the state tree — a shorter one appears first
- Direct data path: parsed[0][8] = array of all place entries
- Two URL formats:
  - `/maps/placelists/list/<id>` — data embedded in APP_INITIALIZATION_STATE (largest XSSI string)
  - `/@lat,lng,zoom/data=...!2s<id>!3e3` (opened from "Saved") — data NOT in page; fetched lazily.
    Extractor falls back to `/maps/preview/entitylist/getlist?...&pb=!1m4!1s<id>!2e1!3m1!1e1!2e2!3e2!4i1000`
    (same-origin fetch carries cookies; session token in the original request is NOT required)
- List ID regex: `/placelists/list/<id>` or `!2s<id>` in the data= segment
- Ratings and categories are NOT in the list payload — they require Google Places API
