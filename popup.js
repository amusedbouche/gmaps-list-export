let cachedPlaces = [];
let cachedListName = 'maps-list';
let cachedTabUrl = '';
let userLat = null;
let userLng = null;

const statusEl      = document.getElementById('status');
const resultsEl     = document.getElementById('results');
const previewEl     = document.getElementById('preview');
const countEl       = document.getElementById('count');
const filterInput   = document.getElementById('filter-input');
const sortSelect    = document.getElementById('sort-select');
const btnExtract    = document.getElementById('btn-extract');
const btnCopy       = document.getElementById('btn-copy');
const btnCsv        = document.getElementById('btn-csv');
const btnMaps       = document.getElementById('btn-maps');

btnExtract.addEventListener('click', extract);
filterInput.addEventListener('input', render);
sortSelect.addEventListener('change', () => {
  if (sortSelect.value === 'distance' && userLat === null) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        render();
      },
      () => {
        sortSelect.value = 'default';
        statusEl.textContent = 'Location access denied — distance sort unavailable.';
      }
    );
  } else {
    render();
  }
});

btnMaps.addEventListener('click', () => {
  if (cachedTabUrl) chrome.tabs.create({ url: cachedTabUrl });
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
  cachedTabUrl = tab.url;

  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      statusEl.textContent = `Loading list, retrying… (${attempt}/4)`;
      await sleep(600);
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        files: ['extractor.js']
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
        sortSelect.value = 'default';
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

function getVisible() {
  const q = filterInput.value.trim().toLowerCase();
  let places = q
    ? cachedPlaces.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.note && p.note.toLowerCase().includes(q))
      )
    : [...cachedPlaces];

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

function render() {
  const visible = getVisible();
  const total = cachedPlaces.length;
  countEl.textContent = visible.length === total
    ? `${total} place${total !== 1 ? 's' : ''} found`
    : `${visible.length} of ${total} places`;

  previewEl.textContent = visible
    .map((p, i) => {
      let line = `${i + 1}. ${p.name}`;
      if (p.address) line += `\n   ${p.address}`;
      if (p.note) line += `\n   📝 ${p.note}`;
      return line;
    })
    .join('\n');

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
