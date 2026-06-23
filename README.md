# gmaps-list-export

A Chrome extension that extracts all places from a Google Maps shared list and exports them as plain text or CSV.

## Features

- Extracts all places from a Google Maps saved list — works with both shared
  `/placelists/` links and lists opened from **Saved** (`/@lat,lng/data=…`)
- Captures name, personal notes, address, and coordinates (lat/lng) for every place
- Copy to clipboard as a plain text list
- Download as CSV (named after the list, e.g. `food.csv`)
- Works on lists of any size — no scrolling required
- Filter by name, address, or notes
- Filter by area: enter a ZIP or city + radius (1/5/10/25 mi) to show only nearby places
- Sort by name (A–Z, Z–A) or distance from current location
- Open any place directly in Google Maps
- Remembers extracted places and filters per tab until the browser closes

## Project structure

```
src/         extension source (popup, extractor)
icons/       toolbar icons
scripts/     git hooks and dev scripts
manifest.json  Chrome extension manifest
```

## Installation

1. Clone this repo or download the source
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this folder

## Usage

1. Open a Google Maps shared list URL, e.g.:
   `https://maps.app.goo.gl/wyqaYHeENUSvdyF58`
2. Wait for the list to load
3. Click the extension icon in the toolbar
4. Click **Extract Places**
5. Use **Copy Text** or **Download CSV**

## CSV Format

| Name | Note | Address | Latitude | Longitude |
|------|------|---------|----------|-----------|
| Mensho Tokyo SF | | | 37.786699 | -122.414342 |
| Kajiken | best mazemen | 112 S B St, San Mateo, CA | 37.566691 | -122.323994 |

## How it works

The extension reads list data in the page's main world rather than scraping the DOM, so it captures every place instantly regardless of list size. Two cases are handled:

- **Shared `/placelists/` links** — Google embeds all list data in `window.APP_INITIALIZATION_STATE` on page load; the extension reads the largest XSSI-prefixed blob directly.
- **Lists opened from Saved (`/@lat,lng/data=…`)** — data is loaded lazily and isn't in the page state, so the extension fetches it from Google's internal `entitylist/getlist` endpoint using the list ID in the URL. The request is same-origin and relies on the browser's existing Google session — no API key, no stored credentials, nothing tied to a specific account.

The area filter geocodes the entered ZIP/city via the free OpenStreetMap Nominatim API and filters places by Haversine distance.

## Future

- iOS app
