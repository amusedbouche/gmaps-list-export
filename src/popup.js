let cachedPlaces = [];
let cachedListName = 'maps-list';
let userLat = null;
let userLng = null;
let zipCenter = null;

const statusEl      = document.getElementById('status');
const resultsEl     = document.getElementById('results');
const previewEl     = document.getElementById('preview');
const countEl       = document.getElementById('count');
const filterInput   = document.getElementById('filter-input');
const zipInput      = document.getElementById('zip-input');
const radiusSelect  = document.getElementById('radius-select');
const btnZip        = document.getElementById('btn-zip');
const btnZipClear   = document.getElementById('btn-zip-clear');
const sortSelect    = document.getElementById('sort-select');
const btnExtract    = document.getElementById('btn-extract');
const btnCopy       = document.getElementById('btn-copy');
const btnCsv        = document.getElementById('btn-csv');

btnExtract.addEventListener('click', extract);
filterInput.addEventListener('input', () => { render(); saveSession(); });
btnZip.addEventListener('click', applyZipFilter);
btnZipClear.addEventListener('click', () => {
  zipCenter = null;
  zipInput.value = '';
  btnZip.textContent = 'Filter by area';
  btnZip.classList.remove('active');
  btnZipClear.style.display = 'none';
  render();
  saveSession();
});
radiusSelect.addEventListener('change', () => {
  if (zipCenter) {
    btnZip.textContent = `Within ${radiusSelect.value} mi of ${zipInput.value.trim()}`;
    render();
    saveSession();
  }
});
sortSelect.addEventListener('change', () => {
  if (sortSelect.value === 'distance' && userLat === null) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        render(); saveSession();
      },
      () => {
        sortSelect.value = 'default';
        statusEl.textContent = 'Location access denied — distance sort unavailable.';
      }
    );
  } else {
    render(); saveSession();
  }
});

async function extract() {
  statusEl.textContent = 'Extracting…';
  resultsEl.style.display = 'none';
  btnExtract.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('google.com/maps')) {
    showError('Open a Google Maps list first.');
    return;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      statusEl.textContent = `Loading list, retrying… (${attempt}/4)`;
      await sleep(600);
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: ['src/extractor.js']
      });
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => window.__mapsExtract()
      });
      if (result?.ok && result.places.length > 0) {
        cachedPlaces = result.places;
        cachedListName = result.listName || 'maps-list';
        filterInput.value = '';
        zipInput.value = '';
        zipCenter = null;
        btnZip.textContent = 'Filter by area';
        btnZip.classList.remove('active');
        btnZipClear.style.display = 'none';
        sortSelect.value = 'default';
        saveSession(tab.id);
        render();
        return;
      }
      if (result?.reason === 'NO_STATE') continue;
    } catch (e) {
      showError('Could not access page: ' + e.message);
      return;
    }
  }
  showError('No places found. Make sure the list is open and fully loaded.');
}

async function applyZipFilter() {
  const zip = zipInput.value.trim();
  if (!zip) {
    zipCenter = null;
    btnZip.textContent = 'Filter by area';
    btnZip.classList.remove('active');
    btnZipClear.style.display = 'none';
    render();
    return;
  }
  btnZip.textContent = 'Looking up…';
  btnZip.disabled = true;
  try {
    const isZip = /^\d{5}$/.test(zip);
    const params = isZip
      ? `postalcode=${encodeURIComponent(zip)}&country=US`
      : `city=${encodeURIComponent(zip)}&country=US`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (!data.length) {
      statusEl.textContent = `ZIP ${zip} not found.`;
      zipCenter = null;
      btnZipClear.style.display = 'none';
    } else {
      zipCenter = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      btnZip.classList.add('active');
      btnZip.textContent = `Within ${radiusSelect.value} mi of ${zip}`;
      btnZipClear.style.display = '';
      saveSession();
    }
  } catch {
    statusEl.textContent = 'Could not geocode ZIP — check connection.';
    zipCenter = null;
    btnZipClear.style.display = 'none';
  }
  btnZip.disabled = false;
  render();
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getVisible() {
  const q = filterInput.value.trim().toLowerCase();
  const radius = parseFloat(radiusSelect.value);
  let places = cachedPlaces.filter(p => {
    if (q && !(
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.note && p.note.toLowerCase().includes(q))
    )) return false;
    if (zipCenter) {
      if (p.lat === null || p.lng === null) return false;
      if (haversineMiles(zipCenter.lat, zipCenter.lng, p.lat, p.lng) > radius) return false;
    }
    return true;
  });

  const sort = sortSelect.value;
  if (sort === 'name-asc') {
    places.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'name-desc') {
    places.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sort === 'distance' && userLat !== null) {
    places.sort((a, b) => dist(a) - dist(b));
  }
  return places;
}

function dist(p) {
  if (p.lat === null || p.lng === null) return Infinity;
  const dlat = p.lat - userLat, dlng = p.lng - userLng;
  return dlat * dlat + dlng * dlng;
}

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapsUrl(p) {
  const query = p.name + (p.address ? ' ' + p.address : '');
  if (p.lat !== null && p.lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&ll=${p.lat},${p.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function render() {
  const visible = getVisible();
  const total = cachedPlaces.length;
  countEl.textContent = visible.length === total
    ? `${total} place${total !== 1 ? 's' : ''} found`
    : `${visible.length} of ${total} places`;

  previewEl.innerHTML = visible
    .map((p, i) => {
      const item = document.createElement('div');
      item.className = 'place-item';
      item.innerHTML = `
        <div class="place-name">${i + 1}. ${escHtml(p.name)}</div>
        ${p.address ? `<div class="place-addr">${escHtml(p.address)}</div>` : ''}
        ${p.note ? `<div class="place-note">📝 ${escHtml(p.note)}</div>` : ''}
        <a class="place-link" href="${mapsUrl(p)}" target="_blank">Open in Maps ↗</a>
      `;
      return item.outerHTML;
    })
    .join('');

  statusEl.textContent = 'Done!';
  resultsEl.style.display = 'block';
  btnExtract.disabled = false;
}

btnCopy.addEventListener('click', () => {
  const text = getVisible()
    .map((p, i) => {
      let line = `${i + 1}. ${p.name}`;
      if (p.address) line += ` — ${p.address}`;
      if (p.note) line += ` | ${p.note.replace(/\n/g, ' ')}`;
      return line;
    })
    .join('\n');
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.textContent = 'Copied!';
    setTimeout(() => { btnCopy.textContent = 'Copy Text'; }, 1500);
  });
});

btnCsv.addEventListener('click', () => {
  const esc = v => {
    if (v === null || v === undefined || v === '') return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = getVisible().map(p =>
    [p.name, p.note || '', p.address || '', p.lat ?? '', p.lng ?? ''].map(esc).join(',')
  );
  const csv = '﻿' + 'Name,Note,Address,Latitude,Longitude\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = cachedListName.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() + '.csv';
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
});

function showError(msg) {
  statusEl.innerHTML = `<span style="color:#d93025">${msg}</span>`;
  btnExtract.disabled = false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let activeTabId = null;

function saveSession(tabId) {
  const id = tabId ?? activeTabId;
  if (!id) return;
  chrome.storage.session.set({
    [String(id)]: {
      places: cachedPlaces,
      listName: cachedListName,
      filterQ: filterInput.value,
      sortVal: sortSelect.value,
      zipVal: zipInput.value,
      radiusVal: radiusSelect.value,
      zipCenter,
    }
  });
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  activeTabId = tab.id;
  const stored = await chrome.storage.session.get(String(tab.id));
  const c = stored[String(tab.id)];
  if (!c?.places?.length) return;

  cachedPlaces = c.places;
  cachedListName = c.listName || 'maps-list';
  filterInput.value = c.filterQ || '';
  sortSelect.value = c.sortVal || 'default';
  zipInput.value = c.zipVal || '';
  radiusSelect.value = c.radiusVal || '5';
  zipCenter = c.zipCenter || null;

  if (zipCenter) {
    btnZip.classList.add('active');
    btnZip.textContent = `Within ${radiusSelect.value} mi of ${zipInput.value}`;
    btnZipClear.style.display = '';
  }

  render();
})();
