/* מדיה מקומית: תמונות, סרטונים, תמונות פרופיל והקלטות קול – ב-IndexedDB במכשיר בלבד. */
const Media = (() => {
  const DB = 'ktifa-media', VER = 1;
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('files')) d.createObjectStore('files'); if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio'); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store), q = fn(s);
      t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }));
  }
  const put = (store, key, val) => tx(store, 'readwrite', (s) => s.put(val, key));
  const get = (store, key) => tx(store, 'readonly', (s) => s.get(key));
  const del = (store, key) => tx(store, 'readwrite', (s) => s.delete(key));
  const keys = (store) => tx(store, 'readonly', (s) => s.getAllKeys());
  const clear = (store) => tx(store, 'readwrite', (s) => s.clear());

  // הקטנת תמונה בצד הלקוח כדי לחסוך מקום
  function shrinkImage(file, max = 1600, quality = 0.86) {
    return new Promise((res) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const k = Math.min(1, max / Math.max(img.width, img.height));
        if (k === 1 && file.size < 1.5e6) return res(file);
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => res(b || file), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  function squareAvatar(file, size = 256) {
    return new Promise((res) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
        const c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size);
        c.toBlob((b) => res(b || file), 'image/jpeg', 0.88);
      };
      img.onerror = () => res(file);
      img.src = url;
    });
  }

  async function saveFile(key, file) {
    let blob = file;
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    if (kind === 'image') blob = await shrinkImage(file);
    await put('files', key, { blob, type: blob.type || file.type, kind, size: blob.size, added: Date.now() });
    return { kind, size: blob.size };
  }
  async function saveAvatar(key, file) { const blob = await squareAvatar(file); await put('files', key, { blob, type: 'image/jpeg', kind: 'image', size: blob.size, added: Date.now() }); return blob.size; }
  const getFile = (key) => get('files', key).catch(() => null);
  const removeFile = (key) => del('files', key).catch(() => {});
  async function usage() {
    try { const ks = await keys('files'); let total = 0; for (const k of ks) { const v = await get('files', k); total += (v && v.size) || 0; } return { count: ks.length, bytes: total }; }
    catch { return { count: 0, bytes: 0 }; }
  }
  const allKeys = () => keys('files').catch(() => []);
  const putRecord = (key, rec) => put('files', key, rec);
  const putAudio = (key, blob) => put('audio', key, blob).catch(() => {});
  const getAudio = (key) => get('audio', key).catch(() => null);
  async function clearAll() { try { await clear('files'); await clear('audio'); } catch { /* אין */ } }
  async function clearAudio() { try { await clear('audio'); } catch { /* אין */ } }
  const fmtBytes = (b) => b > 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
  return { saveFile, saveAvatar, getFile, removeFile, usage, putAudio, getAudio, clearAll, clearAudio, fmtBytes, allKeys, putRecord };
})();
