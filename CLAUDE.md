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

## Extension notes
- `world: 'MAIN'` is required in executeScript — content scripts cannot access window.APP_INITIALIZATION_STATE
- Find the LARGEST XSSI string (starts with `)]}'`) in the state tree — a shorter one appears first
- Direct data path: parsed[0][8] = array of all place entries
- Ratings and categories are NOT in the list payload — they require Google Places API
