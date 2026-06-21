# gmaps-list-export

A Chrome extension that extracts all places from a Google Maps shared list and exports them as plain text or CSV.

## Features

- Extracts all places from a Google Maps saved list (works with shared `/placelists/` links)
- Captures name, personal notes, address, and coordinates (lat/lng) for every place
- Copy to clipboard as a plain text list
- Download as CSV (named after the list, e.g. `food.csv`)
- Works on lists of any size — no scrolling required
- Filter by name, address, or notes
- Sort by name (A–Z, Z–A) or distance from current location
- Open any place directly in Google Maps

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

Google Maps loads all list data into `window.APP_INITIALIZATION_STATE` on page load. The extension reads this directly (in the page's main world) rather than scraping the DOM, so it captures all places instantly regardless of list size.

## Future

- iOS app
