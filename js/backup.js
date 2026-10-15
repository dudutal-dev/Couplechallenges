/* גיבוי ושחזור: קובץ ZIP (ללא דחיסה, נפתח בכל מחשב) עם manifest.json וכל התמונות, הסרטונים ותמונות הפרופיל. */
// eslint-disable-next-line no-unused-vars
const Backup = (() => {
  const PART_LIMIT = 3.5e9; // ZIP רגיל מוגבל ל-4GB; מעבר לזה מפצלים לחלקים
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crcUpdate(crc, u8) { let c = crc ^ 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function crcBlob(blob) { let crc = 0; const CH = 8 << 20; for (let o = 0; o < blob.size; o += CH) { const buf = await blob.slice(o, Math.min(blob.size, o + CH)).arrayBuffer(); crc = crcUpdate(crc, new Uint8Array(buf)); } return crc; }
  const enc = new TextEncoder(), dec = new TextDecoder();
  const u16 = (v, a, o) => { a[o] = v & 255; a[o + 1] = (v >>> 8) & 255; };
  const u32 = (v, a, o) => { a[o] = v & 255; a[o + 1] = (v >>> 8) & 255; a[o + 2] = (v >>> 16) & 255; a[o + 3] = (v >>> 24) & 255; };
  function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }

  // entries: [{ name, blob }] -> Blob של ZIP (שיטת store בלבד)
  async function makeZip(entries, onProgress) {
    const parts = [], central = []; let offset = 0; const { time, date } = dosTime(new Date());
    for (let i = 0; i < entries.length; i++) {
      const { name, blob } = entries[i]; const nameB = enc.encode(name); const crc = await crcBlob(blob); const size = blob.size;
      const lh = new Uint8Array(30 + nameB.length);
      u32(0x04034b50, lh, 0); u16(20, lh, 4); u16(0x0800, lh, 6); u16(0, lh, 8); u16(time, lh, 10); u16(date, lh, 12); u32(crc, lh, 14); u32(size, lh, 18); u32(size, lh, 22); u16(nameB.length, lh, 26); u16(0, lh, 28); lh.set(nameB, 30);
      parts.push(lh, blob);
      const ch = new Uint8Array(46 + nameB.length);
      u32(0x02014b50, ch, 0); u16(20, ch, 4); u16(20, ch, 6); u16(0x0800, ch, 8); u16(0, ch, 10); u16(time, ch, 12); u16(date, ch, 14); u32(crc, ch, 16); u32(size, ch, 20); u32(size, ch, 24); u16(nameB.length, ch, 28); u16(0, ch, 30); u16(0, ch, 32); u16(0, ch, 34); u16(0, ch, 36); u32(0, ch, 38); u32(offset, ch, 42); ch.set(nameB, 46);
      central.push(ch); offset += lh.length + size;
      onProgress && onProgress(i + 1, entries.length);
    }
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const eocd = new Uint8Array(22); u32(0x06054b50, eocd, 0); u16(0, eocd, 4); u16(0, eocd, 6); u16(central.length, eocd, 8); u16(central.length, eocd, 10); u32(cdSize, eocd, 12); u32(offset, eocd, 16); u16(0, eocd, 20);
    return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
  }

  // קריאת ZIP: מחזיר [{ name, blob }] כשה-blob הוא פרוסה עצלה של הקובץ (לא נטען לזיכרון)
  async function readZip(file) {
    const tailLen = Math.min(file.size, 22 + 65536);
    const tail = new Uint8Array(await file.slice(file.size - tailLen).arrayBuffer());
    let e = -1; for (let i = tail.length - 22; i >= 0; i--) if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 5 && tail[i + 3] === 6) { e = i; break; }
    if (e < 0) throw new Error('זה לא קובץ ZIP תקין');
    const dv = new DataView(tail.buffer, e); const count = dv.getUint16(10, true), cdSize = dv.getUint32(12, true), cdOff = dv.getUint32(16, true);
    const cd = new Uint8Array(await file.slice(cdOff, cdOff + cdSize).arrayBuffer()); const cdv = new DataView(cd.buffer);
    const out = []; let p = 0;
    for (let i = 0; i < count; i++) {
      if (cdv.getUint32(p, true) !== 0x02014b50) throw new Error('קובץ ZIP פגום');
      const method = cdv.getUint16(p + 10, true), csize = cdv.getUint32(p + 20, true), nlen = cdv.getUint16(p + 28, true), xlen = cdv.getUint16(p + 30, true), clen = cdv.getUint16(p + 32, true), loff = cdv.getUint32(p + 42, true);
      const name = dec.decode(cd.subarray(p + 46, p + 46 + nlen));
      if (method !== 0) throw new Error('הקובץ דחוס. השתמשו בקובץ הגיבוי כפי שנוצר באפליקציה, בלי לכווץ מחדש');
      const lh = new DataView(await file.slice(loff, loff + 30).arrayBuffer());
      const dataStart = loff + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      out.push({ name, blob: file.slice(dataStart, dataStart + csize) });
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }

  const extOf = (type) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' })[type] || (type && type.startsWith('video/') ? 'mp4' : 'bin');

  // mediaMap: key -> { cardId, slot } או { avatar: 'a' }
  async function exportAll({ app, version, state, mediaMap = {}, progress }) {
    const keys = await Media.allKeys();
    const files = [];
    for (let i = 0; i < keys.length; i++) {
      progress && progress(`קורא קובץ ${i + 1} מתוך ${keys.length}`);
      const rec = await Media.getFile(keys[i]); if (!rec || !rec.blob) continue;
      const type = rec.type || rec.blob.type || '';
      files.push({ key: keys[i], type, kind: rec.kind || (type.startsWith('video/') ? 'video' : 'image'), size: rec.blob.size, added: rec.added || 0, blob: rec.blob, ...(mediaMap[keys[i]] || {}) });
    }
    // פיצול לחלקים
    const groups = [[]]; let acc = 0;
    for (const f of files) { if (acc + f.size > PART_LIMIT && groups[groups.length - 1].length) { groups.push([]); acc = 0; } groups[groups.length - 1].push(f); acc += f.size; }
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const parts = [];
    for (let g = 0; g < groups.length; g++) {
      const list = groups[g].map((f, i) => ({ ...f, name: `media/${String(g + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}.${extOf(f.type)}` }));
      const manifest = { app, version, created: new Date().toISOString(), part: g + 1, parts: groups.length, state, files: list.map(({ blob, ...m }) => m) };
      const entries = [{ name: 'manifest.json', blob: new Blob([JSON.stringify(manifest)], { type: 'application/json' }) }].concat(list.map((f) => ({ name: f.name, blob: f.blob })));
      const blob = await makeZip(entries, (d, t) => progress && progress(`אורז ${d} מתוך ${t}${groups.length > 1 ? ` (חלק ${g + 1}/${groups.length})` : ''}`));
      parts.push({ blob, name: `${app}-backup-${stamp}${groups.length > 1 ? `-part${g + 1}of${groups.length}` : ''}.zip` });
    }
    return { parts, count: files.length, bytes: files.reduce((a, f) => a + f.size, 0) };
  }

  async function importFile(file, progress) {
    progress && progress('קורא את הקובץ');
    const entries = await readZip(file);
    const mf = entries.find((e) => e.name === 'manifest.json'); if (!mf) throw new Error('בקובץ אין manifest.json. זה לא גיבוי של האפליקציה');
    const manifest = JSON.parse(await mf.blob.text());
    const byName = new Map(entries.map((e) => [e.name, e.blob]));
    let count = 0;
    for (const f of manifest.files || []) {
      const blob = byName.get(f.name); if (!blob) continue;
      progress && progress(`משחזר ${count + 1} מתוך ${manifest.files.length}`);
      await Media.putRecord(f.key, { blob: new Blob([await blob.arrayBuffer()], { type: f.type }), type: f.type, kind: f.kind, size: f.size, added: f.added || Date.now() });
      count++;
    }
    return { manifest, count };
  }

  function download(blob, name) {
    const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }
  return { exportAll, importFile, download, makeZip, readZip };
})();
