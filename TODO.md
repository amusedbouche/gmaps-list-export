# TODO

## In Progress
- [ ] Open in Google Maps — button that plots all extracted places on a custom Google Maps URL
- [ ] Filter/search — live text filter on the preview list before copy/export
- [ ] Sort — sort places by name A–Z or by distance from current location (using browser geolocation)

## Backlog
- [ ] Type/category filter (e.g. Restaurant, Hotel) — requires Google Places API key; category is not available in the page data source. Deferred.
- [ ] Google Sheets export — one-click push to a new Sheet via Google Sheets API (needs OAuth)
- [ ] Badge auto-extract — show place count in toolbar badge icon automatically on list pages
- [ ] Multi-list merge — open multiple lists and combine into one export
- [ ] iOS app — accept a shared Maps list URL via Share Sheet, return CSV

## Done
- [x] Extract all places from APP_INITIALIZATION_STATE (no scrolling needed)
- [x] Capture name, personal note, address, lat/lng for all 153 places
- [x] Copy to clipboard as plain text
- [x] Download CSV named after the list (e.g. food.csv)
