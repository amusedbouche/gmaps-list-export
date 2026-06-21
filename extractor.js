(function() {
  window.__mapsExtract = function() {
    const state = window.APP_INITIALIZATION_STATE;
    if (!state) return { ok: false, reason: 'NO_STATE' };

    // Find the largest XSSI-prefixed string in the state tree (contains all place data)
    let bigStr = null;
    function findBiggest(node, depth) {
      if (depth > 20) return;
      if (typeof node === 'string' && node.startsWith(")]}'") && node.length > (bigStr?.length || 0)) {
        bigStr = node;
      } else if (Array.isArray(node)) {
        for (const c of node) findBiggest(c, depth + 1);
      } else if (node && typeof node === 'object') {
        for (const k in node) findBiggest(node[k], depth + 1);
      }
    }
    findBiggest(state, 0);
    if (!bigStr) return { ok: false, reason: 'NO_XSSI_STRING' };

    let parsed;
    try {
      parsed = JSON.parse(bigStr.slice(4).trimStart());
    } catch (e) {
      return { ok: false, reason: 'PARSE_ERROR', detail: e.message };
    }

    // Structure: parsed[0][8] = array of 153 place entries
    // Each entry: [null, [null, null, "Name, Addr", null, "Addr", [null, null, lat, lng], ...], "Name", "", ...]
    const list = parsed?.[0]?.[8];
    if (!Array.isArray(list) || list.length === 0) {
      return { ok: false, reason: 'NO_LIST', detail: `parsed[0][8] = ${JSON.stringify(list).substring(0,100)}` };
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
  };
})();
