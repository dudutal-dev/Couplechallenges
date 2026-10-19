// ייצוא ערב שלם לווידאו (באנגלית): סרטון ״שחקו לפי״ שבו כל משימה מופיעה עם הטקסט שלה, מי בתור וטיימר אמיתי,
// על רקע התמונות והסרטונים שהעליתם, עם הפסקול של האפליקציה. מצויר לקנבס ומוקלט בזמן אמת (MediaRecorder).
// האפליקציה מספקת את הנתונים (EveningVideo.start(data, api)); המודול הזה רק מצייר, מקליט ושומר.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  let job = null;
  const L = (api, he, en) => (api.en ? en : he);
  function supported() { return !!(window.MediaRecorder && document.createElement('canvas').captureStream && (window.AudioContext || window.webkitAudioContext)); }
  function pickMime() { const c = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']; for (const m of c) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { /* */ } } return ''; }
  function overlay() {
    let el = $('#ev-export'); if (el) return el;
    el = document.createElement('div'); el.id = 'ev-export'; el.className = 'overlay pk-export'; el.hidden = true;
    el.innerHTML = `<div class="pk-export-card"><canvas class="pk-canvas" width="1280" height="720"></canvas><h2></h2><p class="muted tiny"></p><div class="pk-export-bar"><i></i></div><p class="muted tiny ev-warn" hidden></p><button type="button" class="btn ghost" data-x="cancel"></button></div>`;
    document.body.appendChild(el);
    $('[data-x=cancel]', el).addEventListener('click', cancel);
    return el;
  }
  function cancel() { if (!job) return; job.cancelled = true; try { job.rec && job.rec.state !== 'inactive' && job.rec.stop(); } catch (e) { /* */ } }
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const mins = (sec) => (sec < 90 ? `${Math.round(sec)} s` : `${Math.round(sec / 60)} min`);
  // משך כל קטע לפי הקצב שנבחר
  function segDur(seg, o) {
    if (o.pace === 'preview') return window.__evPreviewSec || 8;
    if (o.pace === 'compact') return 45;
    const m = seg.min || o.defMin; return seg.closing ? Math.min(m, 3) * 60 : m * 60;
  }
  function estimate(data, o) { return data.segments.reduce((s, g) => s + segDur(g, o) + 5.5, 0) + 22; }

  async function start(data, api) {
    if (job) return;
    if (!supported() || !pickMime()) { api.dialog(`<h2>${L(api, 'לא נתמך בדפדפן הזה', 'Not supported here')}</h2><p>${L(api, 'הדפדפן הזה לא יודע להקליט וידאו מתוך האפליקציה. נסו Chrome במחשב.', 'This browser cannot record video from the app. Try Chrome on a computer.')}</p>`, [{ label: L(api, 'סגירה', 'Close') }]); return; }
    if (!data || !data.segments.length) return;
    const est = (pace) => mins(estimate(data, { pace, defMin: 2 }));
    const html = `<h2>${L(api, '🎬 ייצוא הערב לווידאו', '🎬 Evening video')}</h2>
      <p>${L(api, `סרטון ״שחקו לפי״ באנגלית: ${data.segments.length} קלפים, כל אחד עם הטקסט שלו, מי בתור וטיימר, על רקע התמונות והסרטונים שהעליתם, עם הפסקול של האפליקציה.`, `A play-along video in English: ${data.segments.length} cards, each with its text, whose turn it is and a timer, over the pictures and clips you uploaded, with the app's soundtrack.`)}</p>
      <label>${L(api, 'קצב', 'Pace')}<select id="ev-pace"><option value="real">${L(api, 'זמן אמת: כל משימה רצה את מלוא הטיימר שלה', 'Real time: every task runs its full timer')} (~${est('real')})</option><option value="compact">${L(api, 'דחוס: 45 שניות למשימה', 'Compact: 45 seconds per task')} (~${est('compact')})</option><option value="preview">${L(api, 'תצוגה מקדימה: 8 שניות למשימה', 'Preview: 8 seconds per task')} (~${est('preview')})</option></select></label>
      <label>${L(api, 'משימות בלי טיימר', 'Tasks without a timer')}<select id="ev-def"><option value="2">2 ${L(api, 'דקות', 'minutes')}</option><option value="3">3</option><option value="5">5</option></select></label>
      <label>${L(api, 'פסקול', 'Soundtrack')}<select id="ev-snd"><option value="on">${L(api, 'דלוק', 'On')}</option><option value="off">${L(api, 'כבוי (רק צלילי טיימר)', 'Off (timer sounds only)')}</option></select></label>
      <label>${L(api, 'גודל', 'Size')}<select id="ev-res"><option value="720">1280 × 720</option><option value="540">960 × 540</option></select></label>
      <p class="muted tiny">${L(api, 'ההקלטה בזמן אמת: משאירים את האפליקציה פתוחה ועל המסך עד הסוף. במחשב (Chrome) הקובץ נכתב ישירות לדיסק, אז גם ערב של שעה בסדר; בטלפון עדיף ״דחוס״.', 'Recording runs in real time: keep the app open and on screen until the end. On a computer (Chrome) the file is written straight to disk, so even a one-hour evening is fine; on a phone prefer Compact.')}</p>`;
    api.dialog(html, [
      { label: L(api, 'התחלת הקלטה', 'Start rendering'), cls: 'primary', onClick: () => { const o = { pace: $('#ev-pace').value, defMin: +$('#ev-def').value, sound: $('#ev-snd').value === 'on', res: +$('#ev-res').value }; run(data, api, o); } },
      { label: L(api, 'ביטול', 'Cancel') }]);
  }

  async function run(data, api, o) {
    const mime = pickMime(), ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', type = mime.split(';')[0];
    const name = `${data.appId}-evening-${new Date().toISOString().slice(0, 10)}.${ext}`;
    // במחשב: כתיבה ישירה לקובץ (בלי להחזיק הכול בזיכרון). חייב לקרות בתוך מחוות המשתמש, לפני כל await אחר.
    let writable = null;
    if (window.showSaveFilePicker && !o.noPicker) {
      try { const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Video', accept: { [type]: ['.' + ext] } }] }); writable = await h.createWritable(); } catch (e) { if (e && e.name === 'AbortError') return; writable = null; }
    }
    const A = window.TeaserAudio && TeaserAudio.init(); if (!A) { api.dialog('<h2>Audio</h2><p>No audio context.</p>', [{ label: 'OK' }]); return; }
    const el = overlay(), cv = $('canvas', el), g = cv.getContext('2d');
    const W = o.res === 540 ? 960 : 1280, H = Math.round(W * 9 / 16); cv.width = W; cv.height = H;
    const title = $('h2', el), sub = $('p', el), bar = $('.pk-export-bar i', el), warn = $('.ev-warn', el);
    title.textContent = L(api, 'מקליט את הערב…', 'Recording the evening…'); sub.textContent = ''; $('[data-x=cancel]', el).textContent = L(api, 'עצירה ושמירה', 'Stop and save'); bar.style.width = '0%';
    warn.textContent = L(api, 'החלון לא על המסך: ההקלטה קופאת עד שחוזרים.', 'The window is not on screen: recording freezes until you return.');
    const vis = () => { warn.hidden = !document.hidden; }; document.addEventListener('visibilitychange', vis);
    el.hidden = false; document.body.classList.add('peek-on'); api.requestWake && api.requestWake();
    try { await document.fonts.load('900 60px "Frank Ruhl Libre"'); await document.fonts.load('600 26px Heebo'); } catch (e) { /* */ }
    const SERIF = '"Frank Ruhl Libre","David Libre","Times New Roman",serif', SANS = 'Heebo,system-ui,sans-serif';
    api.pauseMusic && api.pauseMusic();
    const ctx = A.ctx, recDest = ctx.createMediaStreamDestination(); A.bus.connect(recDest);
    const vs = cv.captureStream(30), stream = new MediaStream(vs.getVideoTracks().concat(recDest.stream.getAudioTracks()));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: o.res === 540 ? 2.2e6 : 3.5e6, audioBitsPerSecond: 128e3 });
    const chunks = []; let bytes = 0, wq = Promise.resolve();
    rec.ondataavailable = (e) => { if (!e.data || !e.data.size) return; bytes += e.data.size; if (writable) wq = wq.then(() => writable.write(e.data)).catch(() => {}); else chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = res; });
    job = { rec, cancelled: false };
    const total = estimate(data, o), t0 = performance.now();
    const progress = () => { const el2 = (performance.now() - t0) / 1000; bar.style.width = Math.round(Math.min(1, el2 / total) * 100) + '%'; sub.textContent = `${fmt(el2)} / ~${fmt(total)} · ${Math.round(bytes / 1e6)} MB`; };
    // --- צלילים קצרים (טיימר) ישירות ל-bus ---
    const beep = (f, t, dur, gain, type) => { try { const osc = ctx.createOscillator(), gn = ctx.createGain(); osc.type = type || 'sine'; osc.frequency.value = f; gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(gain, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); osc.connect(gn); gn.connect(A.bus); osc.start(t); osc.stop(t + dur + 0.05); } catch (e) { /* */ } };
    const chime = () => { const t = ctx.currentTime; beep(660, t, 0.5, 0.25); beep(880, t + 0.18, 0.7, 0.22); beep(1320, t + 0.36, 1.1, 0.14); };
    const tick = () => beep(1200, ctx.currentTime, 0.06, 0.08, 'square');
    if (o.sound) { TeaserAudio.start(data.style); TeaserAudio.set(0); }
    const snd = (p) => { if (o.sound) TeaserAudio.set(p); };
    const boom = (a) => { if (o.sound) TeaserAudio.boom(a); else beep(90, ctx.currentTime, 0.5, 0.2 * a); };
    // --- ציור ---
    const theme = data.theme || { accent: '#e8c36a', accent2: '#fff', glow: '#c9a24a' };
    const black = () => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); };
    const bgPlain = () => { const r = g.createRadialGradient(W / 2, H * 0.1, 10, W / 2, H / 2, H); r.addColorStop(0, data.theme && data.theme.bg2 ? data.theme.bg2 : '#2a0810'); r.addColorStop(1, data.theme && data.theme.bg ? data.theme.bg : '#090507'); g.fillStyle = r; g.fillRect(0, 0, W, H); };
    const vignette = (a) => { const r = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${0.75 * a})`); g.fillStyle = r; g.fillRect(0, 0, W, H); };
    const wrap = (t, maxW) => { const words = String(t).split(/\s+/), out = []; let cur = ''; for (const w of words) { const test = cur ? cur + ' ' + w : w; if (g.measureText(test).width > maxW && cur) { out.push(cur); cur = w; } else cur = test; } if (cur) out.push(cur); return out; };
    const cover = (m, k, zoomIn, dark) => { const iw = m.videoWidth || m.naturalWidth || 1, ih = m.videoHeight || m.naturalHeight || 1; const sc = Math.max(W / iw, H / ih) * (m.tagName === 'IMG' ? (zoomIn ? 1 + 0.07 * k : 1.07 - 0.07 * k) : 1.0), dw = iw * sc, dh = ih * sc; black(); try { g.drawImage(m, (W - dw) / 2, (H - dh) / 2, dw, dh); } catch (e) { /* */ } g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, W, H); };
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const S = W / 1280; // קנה מידה לכל הגדלים
    const centerText = (text, small, k, big) => { // כמו בטיזר: כניסה/יציאה
      const a = k < 0.2 ? k / 0.2 : (k > 0.8 ? (1 - k) / 0.2 : 1), sc = 1.05 - 0.05 * Math.min(1, k / 0.2);
      vignette(a); g.save(); g.globalAlpha = a; g.translate(W / 2, H / 2); g.scale(sc, sc); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.shadowColor = '#000'; g.shadowBlur = 24;
      if (small) { g.fillStyle = theme.accent; g.font = `600 ${26 * S}px ${SANS}`; g.fillText(small.toUpperCase(), 0, -64 * S); }
      g.fillStyle = '#fff'; const fs = (big ? 64 : 84) * S; g.font = `900 ${fs}px ${SERIF}`;
      const lines = wrap(text, W * 0.8); lines.forEach((ln, i) => g.fillText(ln, 0, (i - (lines.length - 1) / 2) * fs * 1.15 + (small ? 12 * S : 0)));
      g.restore();
    };
    const chip = (x, y, text, strong) => { g.font = `600 ${22 * S}px ${SANS}`; const w = g.measureText(text).width + 28 * S, h = 38 * S; g.fillStyle = 'rgba(0,0,0,.55)'; g.strokeStyle = strong ? theme.accent : 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, h / 2); else g.rect(x, y, w, h); g.fill(); g.stroke(); g.fillStyle = strong ? theme.accent : '#eee'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, x + 14 * S, y + h / 2 + 1); return w; };
    const taskFrame = (seg, bg, elapsed, dur, kb) => {
      if (bg) cover(bg.m, kb, bg.zoomIn, 0.58); else bgPlain();
      vignette(0.8);
      g.save(); g.direction = 'ltr'; g.shadowColor = '#000'; g.shadowBlur = 12;
      // למעלה: מספר, קטגוריה, למי · מי בתור
      let x = 48 * S; const y = 40 * S;
      x += chip(x, y, `${seg.n} / ${seg.total}`, false) + 10 * S;
      x += chip(x, y, seg.cat, true) + 10 * S;
      if (seg.to) x += chip(x, y, seg.to, false) + 10 * S;
      if (seg.act) chip(x, y, seg.act, false);
      g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = `700 ${26 * S}px ${SANS}`; g.fillText(seg.lead, W - 48 * S, y + 19 * S);
      // הטקסט
      let fs = 46 * S, lines; g.textAlign = 'center';
      for (;;) { g.font = `700 ${fs}px ${SERIF}`; lines = wrap(seg.text, W * 0.8); if (lines.length * fs * 1.25 <= H * 0.5 || fs <= 26 * S) break; fs -= 3 * S; }
      g.fillStyle = '#fff'; const top = H * 0.5 - (lines.length - 1) / 2 * fs * 1.25;
      lines.forEach((ln, i) => g.fillText(ln, W / 2, top + i * fs * 1.25));
      if (seg.safe) { g.font = `500 ${20 * S}px ${SANS}`; g.fillStyle = theme.accent; g.fillText('⚠ ' + seg.safe, W / 2, H - 130 * S); }
      // טיימר: פס + ספרות
      const left = Math.max(0, dur - elapsed), k = Math.min(1, elapsed / dur);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(48 * S, H - 64 * S, W - 96 * S, 6 * S);
      g.fillStyle = left <= 10 ? '#ff7a6a' : theme.accent; g.fillRect(48 * S, H - 64 * S, (W - 96 * S) * (1 - k), 6 * S);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = `900 ${44 * S}px ${SERIF}`; g.fillStyle = left <= 10 ? '#ff7a6a' : '#fff'; g.fillText(fmt(left), 48 * S, H - 84 * S);
      g.textAlign = 'right'; g.font = `500 ${20 * S}px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(seg.next ? `Next: ${seg.next}` : data.appName, W - 48 * S, H - 84 * S);
      g.restore();
    };
    const over = async (base, text, small, ms, big) => { const s = performance.now(); let k = 0; while (k < 1 && !job.cancelled) { k = Math.min(1, (performance.now() - s) / ms); base(); centerText(text, small, k, big); progress(); await frame(); } };
    const hold = async (draw, ms) => { const s = performance.now(); while (performance.now() - s < ms && !job.cancelled) { draw(); progress(); await frame(); } };
    const loadMedia = async (seg) => {
      if (!seg.mediaKey || !window.Media) return null;
      let r; try { r = await Media.getFile(seg.mediaKey); } catch (e) { return null; } if (!r || !r.blob) return null;
      const u = URL.createObjectURL(r.blob);
      if (r.kind === 'video' || seg.kind === 'video') { const v = document.createElement('video'); v.src = u; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; await new Promise((res) => { v.onloadeddata = res; v.onerror = res; setTimeout(res, 4000); }); const p = v.play(); if (p && p.catch) p.catch(() => {}); return { m: v, u, zoomIn: false, free: () => { try { v.pause(); v.removeAttribute('src'); } catch (e) { /* */ } URL.revokeObjectURL(u); } }; }
      const im = new Image(); im.src = u; await new Promise((res) => { im.onload = res; im.onerror = res; setTimeout(res, 4000); }); return { m: im, u, zoomIn: Math.random() < 0.5, free: () => URL.revokeObjectURL(u) };
    };
    try {
      black(); rec.start(1000);
      // פתיחה
      boom(0.8);
      await over(black, data.appName, data.tagline || '', 3000, false);
      boom(0.6); await over(black, `${data.names[0]} & ${data.names[1]}`, 'Tonight', 2400, false);
      await over(bgPlain, `Stop word: ${data.stopWord}`, 'Before you start', 3200, true);
      await over(bgPlain, 'It stops everything, at once, no questions.', '', 2600, true);
      await over(bgPlain, `${data.segments.length} cards · from gentle to intense · each with its own clock`, '', 3000, true);
      // קלפים
      const n = data.segments.filter((s) => !s.closing).length;
      for (let i = 0; i < data.segments.length && !job.cancelled; i++) {
        const seg = data.segments[i], dur = segDur(seg, o), p = seg.closing ? -1 : (n > 1 ? 0.1 + 0.9 * Math.min(i, n - 1) / (n - 1) : 0.5);
        snd(p); await hold(black, 350); boom(seg.closing ? 0.4 : 0.7 + 0.4 * Math.max(0, p));
        await over(black, seg.cat, seg.closing ? 'To close' : `Card ${seg.n} of ${seg.total}${seg.act ? ' · ' + seg.act : ''}`, 2200, false);
        const bg = await loadMedia(seg);
        const s = performance.now(); let lastTick = -1;
        while (!job.cancelled) {
          const t = (performance.now() - s) / 1000; if (t >= dur) break;
          const kb = Math.min(1, t / Math.max(8, dur));
          taskFrame(seg, bg, t, dur, kb);
          if (t < 0.6) { g.fillStyle = `rgba(0,0,0,${1 - t / 0.6})`; g.fillRect(0, 0, W, H); }
          const left = Math.ceil(dur - t); if (left <= 3 && left !== lastTick) { lastTick = left; tick(); }
          progress(); await frame();
        }
        if (job.cancelled) { bg && bg.free(); break; }
        chime();
        await over(() => taskFrame(seg, bg, dur, dur, 1), seg.closing ? 'Tonight.' : 'Time.', '', 2400, false);
        bg && bg.free();
      }
      if (!job.cancelled) { snd(-1); boom(0.9); await over(black, 'Until next time.', '', 2600, false); await over(black, data.appName, data.tagline || '', 2600, false); await hold(black, 800); }
    } catch (e) { console.warn('evening video', e); }
    try { rec.state !== 'inactive' && rec.stop(); } catch (e) { /* */ }
    await done; await wq;
    try { A.bus.disconnect(recDest); } catch (e) { /* */ }
    try { TeaserAudio.stop(); } catch (e) { /* */ }
    document.removeEventListener('visibilitychange', vis);
    job = null; el.hidden = true; document.body.classList.remove('peek-on');
    api.resumeMusic && api.resumeMusic();
    if (writable) { try { await writable.close(); } catch (e) { /* */ } api.dialog(`<h2>${L(api, 'הסרטון נשמר', 'The video is saved')}</h2><p class="muted tiny">${name} · ${Math.round(bytes / 1e6)} MB</p>`, [{ label: L(api, 'סגירה', 'Close') }]); return; }
    if (!chunks.length) return;
    const blob = new Blob(chunks, { type }), file = new File([blob], name, { type });
    const canShare = navigator.canShare && navigator.share && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })();
    const dl = () => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 4000); };
    const btns = [];
    if (canShare) btns.push({ label: L(api, 'שמירה / שיתוף…', 'Save / share…'), cls: 'primary', onClick: () => { navigator.share({ files: [file], title: 'Tonight' }).catch(() => {}); } });
    btns.push({ label: L(api, 'הורדת הקובץ', 'Download file'), cls: canShare ? 'ghost' : 'primary', onClick: dl });
    btns.push({ label: L(api, 'סגירה', 'Close') });
    api.dialog(`<h2>${L(api, 'הסרטון מוכן', 'The video is ready')}</h2><p class="muted tiny">${name} · ${Math.round(blob.size / 1e6)} MB</p>`, btns);
  }
  window.EveningVideo = { start, cancel, supported, busy: () => !!job };
})();
