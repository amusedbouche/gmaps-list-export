# Done

- Extracted all places from APP_INITIALIZATION_STATE (no DOM scrolling)
- Captured name, personal note, address, lat/lng for all places
- Copy to clipboard as plain text
- Download CSV named after the list (e.g. food.csv)
- Added filter/search — filters preview, copy, and CSV by name/address/note
- Added sort — by name A–Z, Z–A, or nearest first (browser geolocation)
- Added per-place "Open in Maps ↗" links (name + ll bias opens the business, not a raw pin)
- Added area filter — ZIP/city + radius (1/5/10/25 mi) via Nominatim geocoding + Haversine distance
- Added per-tab session persistence — places and filters restored until browser closes
- Supported "Saved" list URLs (/@lat,lng/data=…) via entitylist/getlist fetch fallback
- Added top-level icons block to manifest so the icon shows on chrome://extensions
