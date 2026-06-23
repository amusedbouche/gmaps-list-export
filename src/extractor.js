(function() {
  function parseListPayload(bigStr) {
    let parsed;
    try {
      parsed = JSON.parse(bigStr.slice(4).trimStart());
    } catch (e) {
      return { ok: false, reason: 'PARSE_ERROR', detail: e.message };
    }

    // Structure: parsed[0][8] = array of place entries
    // Each entry: [null, [null, null, "Name, Addr", null, "Addr", [null, null, lat, lng], ...], "Name", "note", ...]
    const list = parsed?.[0]?.[8];
    if (!Array.isArray(list) || list.length === 0) {
      return { ok: false, reason: 'NO_LIST', detail: `parsed[0][8] = ${JSON.stringify(list).substring(0, 100)}` };
    }

    const places = list.map(entry => {
      const name    = entry?.[2] || '';
      const note    = entry?.[3] || '';
      const address = entry?.[1]?.[4] || '';
      const coords  = entry?.[1]?.[5];
      const lat     = Array.isArray(coords) && typeof coords[2] === 'number' ? coords[2] : null;
      const lng     = Array.isArray(coords) && typeof coords[3] === 'number' ? coords[3] : null;
      return { name, note, address, lat, lng };
    }).filter(p => p.name);

    const listName = parsed?.[0]?.[4] || 'maps-list';
    return { ok: true, places, listName };
  }

  // Largest XSSI-prefixed string anywhere in the state tree holds all place data.
  // The recursive walk descends into both arrays and objects (e.g. state[3].kg),
  // so it covers /placelists/list/<id> URLs where the data is embedded in the page.
  function findBiggestXssi(node, best, depth) {
    if (depth > 20) return best;
    if (typeof node === 'string' && node.startsWith(")]}'") && node.length > (best?.length || 0)) {
      return node;
    }
    if (Array.isArray(node)) {
      for (const c of node) best = findBiggestXssi(c, best, depth + 1);
    } else if (node && typeof node === 'object') {
      for (const k in node) best = findBiggestXssi(node[k], best, depth + 1);
    }
    return best;
  }

  function extractListId() {
    const url = location.href;
    // /maps/placelists/list/<id>
    let m = url.match(/\/placelists\/list\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    // /@lat,lng,zoom/data=...!2s<id>!3e3 (list opened from "Saved")
    m = url.match(/!2s([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    return null;
  }

  window.__mapsExtract = async function() {
    // Path 1: data embedded in the page (normal /placelists/list/ URL)
    const state = window.APP_INITIALIZATION_STATE;
    if (state) {
      const bigStr = findBiggestXssi(state, null, 0);
      if (bigStr) {
        const result = parseListPayload(bigStr);
        if (result.ok) return result;
      }
    }

    // Path 2: fetch the list directly (the @lat,lng/data= "Saved" view loads
    // its data lazily, so it is never in APP_INITIALIZATION_STATE)
    const listId = extractListId();
    if (!listId) return { ok: false, reason: 'NO_LIST_ID' };
    try {
      const url = `/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=us&pb=!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i1000`;
      const res = await fetch(url);
      const text = await res.text();
      return parseListPayload(text);
    } catch (e) {
      return { ok: false, reason: 'FETCH_ERROR', detail: e.message };
    }
  };
})();
