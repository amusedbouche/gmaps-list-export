let cachedPlaces = [];
let cachedListName = 'maps-list';

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const previewEl = document.getElementById('preview');
const countEl = document.getElementById('count');
const btnExtract = document.getElementById('btn-extract');
const btnCopy = document.getElementById('btn-copy');
const btnCsv = document.getElementById('btn-csv');

btnExtract.addEventListener('click', extract);

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

function render() {
  countEl.textContent = `${cachedPlaces.length} place${cachedPlaces.length !== 1 ? 's' : ''} found`;
  previewEl.textContent = cachedPlaces
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
  const text = cachedPlaces
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
  const rows = cachedPlaces.map(p =>
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
