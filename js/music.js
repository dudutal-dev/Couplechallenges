// מוזיקת רקע מ-YouTube: נגן מוטמע קטן שממשיך לנגן בכל המסכים, מועדפים (משותפים לשלוש האפליקציות באותו דפדפן),
// ובחירה מה מתנגן אוטומטית בפתיחת ערב. בלי סיסמאות: ההתחברות ל-YouTube נעשית בדף של גוגל בדפדפן,
// והנגן המוטמע משתמש בה (חשבון Premium = בלי פרסומות).
(function () {
  const APP = location.pathname.split('/').filter(Boolean)[0] || 'app';
  const FAV_KEY = 'music.favs.v1', CFG_KEY = 'music.cfg.v1:' + APP;
  const load = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return d; } };
  let favs = load(FAV_KEY, { items: [] }).items || [];
  const cfg = load(CFG_KEY, { auto: 'last', pick: null, vol: 60, last: null, shuffle: true });
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify({ items: favs })); } catch (e) { /* */ } };
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* */ } };
  const en = () => document.documentElement.lang === 'en';
  const L = (he, e) => (en() ? e : he);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
  const same = (a, b) => a && b && a.id === b.id && a.kind === b.kind;
  const isFav = (it) => !!favs.find((f) => same(f, it));

  // ---------- קישור → {id, kind} ----------
  function parse(input) {
    const t = String(input || '').trim();
    if (!t) return null;
    if (/^[\w-]{11}$/.test(t)) return { id: t, kind: 'video' };
    if (/^(PL|OLAK5uy_|RD|UU|LL|FL)[\w-]{10,}$/.test(t)) return { id: t, kind: 'list' };
    let u; try { u = new URL(t.indexOf('http') === 0 ? t : 'https://' + t); } catch (e) { return null; }
    if (!/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(u.hostname)) return null;
    const list = u.searchParams.get('list'), v = u.searchParams.get('v');
    if (u.pathname === '/playlist' && list) return { id: list, kind: 'list' };
    if (v && /^[\w-]{11}$/.test(v)) return list && /^(PL|OLAK5uy_)/.test(list) ? { id: list, kind: 'list', startId: v } : { id: v, kind: 'video' };
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || (u.hostname === 'youtu.be' ? u.pathname.match(/^\/([\w-]{11})/) : null);
    if (m) return { id: m[1], kind: 'video' };
    if (list) return { id: list, kind: 'list' };
    return null;
  }
  const urlOf = (it) => it.kind === 'list' ? `https://www.youtube.com/playlist?list=${it.id}` : `https://www.youtube.com/watch?v=${it.id}`;
  async function fetchTitle(it) {
    for (const api of [`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(urlOf(it))}`, `https://noembed.com/embed?url=${encodeURIComponent(urlOf(it))}`]) {
      try { const r = await fetch(api); if (!r.ok) continue; const j = await r.json(); if (j && j.title) return j.title; } catch (e) { /* הבא */ }
    }
    return null;
  }

  // ---------- נגן ----------
  let yt = null, apiState = 'idle', pending = null, current = null, nowTitle = '', playing = false, bar = null, screenHost = null, statusMsg = '';
  const barHtml = () => `<div class="mb-video"><div id="yt-host"></div></div>
    <div class="mb-info"><b class="mb-title"></b><small class="mb-sub"></small></div>
    <button type="button" class="mb-btn" data-m="toggle" title="${L('נגן / השהה', 'Play / pause')}">⏸</button>
    <button type="button" class="mb-btn" data-m="next" title="${L('הבא', 'Next')}">⏭</button>
    <button type="button" class="mb-btn" data-m="fav" title="${L('מועדף', 'Favorite')}">☆</button>
    <button type="button" class="mb-btn" data-m="close" title="${L('סגירה', 'Close')}">✕</button>`;
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.className = 'music-bar off'; bar.id = 'music-bar'; bar.innerHTML = barHtml();
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const a = b.dataset.m;
      if (a === 'toggle') toggle(); else if (a === 'next') next(); else if (a === 'fav') { if (current) toggleFav(current); } else if (a === 'close') stop(); });
    return bar;
  }
  function showBar(on) { ensureBar(); bar.classList.toggle('off', !on); document.body.classList.toggle('music-on', on); }
  function setStatus(msg) { statusMsg = msg; paintBar(); paintScreen(); }
  function paintBar() {
    if (!bar) return;
    const t = $('.mb-title', bar), s = $('.mb-sub', bar);
    t.textContent = nowTitle || (current ? (current.title || (current.kind === 'list' ? L('פלייליסט', 'Playlist') : L('YouTube', 'YouTube'))) : '');
    s.textContent = statusMsg || (current && current.kind === 'list' && current.title && nowTitle && nowTitle !== current.title ? current.title : (playing ? L('מתנגן', 'Playing') : L('מושהה', 'Paused')));
    $('[data-m=toggle]', bar).textContent = playing ? '⏸' : '▶';
    $('[data-m=next]', bar).hidden = !(current && current.kind === 'list');
    $('[data-m=fav]', bar).textContent = current && isFav(current) ? '★' : '☆';
  }
  function loadApi() {
    if (apiState !== 'idle') return;
    apiState = 'loading';
    window.onYouTubeIframeAPIReady = () => { apiState = 'ready'; statusMsg = ''; if (pending) { const p = pending; pending = null; play(p, pendingAuto); } else cueOnly(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { apiState = 'error'; setStatus(L('אין חיבור ל-YouTube', 'No connection to YouTube')); };
    document.head.appendChild(s);
    setTimeout(() => { if (apiState === 'loading') { apiState = 'error'; setStatus(L('YouTube לא נטען. בודקים אינטרנט ומנסים שוב.', 'YouTube did not load. Check the connection and try again.')); } }, 15000);
  }
  let pendingAuto = true;
  function onState(e) {
    const st = e.data, YTp = window.YT && window.YT.PlayerState;
    if (!YTp) return;
    playing = st === YTp.PLAYING || st === YTp.BUFFERING;
    notify();
    try { const d = yt.getVideoData(); if (d && d.title) { nowTitle = d.title; if (current && current.kind === 'video' && !current.title) { current.title = d.title; const f = favs.find((x) => same(x, current)); if (f) { f.title = d.title; saveFavs(); } cfg.last = current; saveCfg(); } } } catch (err) { /* */ }
    if (st === YTp.ENDED && current && current.kind === 'video') { try { yt.seekTo(0); yt.playVideo(); } catch (err) { /* */ } }
    if (st === YTp.PLAYING) statusMsg = '';
    paintBar(); paintScreen();
  }
  function onErr(e) {
    const code = e && e.data;
    setStatus(code === 150 || code === 101 ? L('הסרטון הזה לא ניתן להטמעה. נסו אחר או פלייליסט.', 'This video cannot be embedded. Try another one or a playlist.') : L('YouTube החזיר שגיאה', 'YouTube returned an error') + (code ? ' ' + code : ''));
    if (current && current.kind === 'list') { try { yt.nextVideo(); } catch (err) { /* */ } }
  }
  function createPlayer(it, autoplay) {
    ensureBar();
    const vars = { playsinline: 1, autoplay: autoplay ? 1 : 0, rel: 0, controls: 1, fs: 0, iv_load_policy: 3, origin: location.origin };
    const opts = { host: 'https://www.youtube.com', width: 112, height: 63, playerVars: vars, events: { onReady: (e) => { try { e.target.setVolume(cfg.vol); } catch (err) { /* */ } if (it.kind === 'list') { try { e.target.setLoop(true); e.target.setShuffle(!!cfg.shuffle); } catch (err) { /* */ } } if (autoplay) { try { e.target.playVideo(); } catch (err) { /* */ } } paintBar(); paintScreen(); }, onStateChange: onState, onError: onErr } };
    if (it.kind === 'list') Object.assign(vars, { listType: 'playlist', list: it.id, loop: 1 }); else opts.videoId = it.id;
    yt = new window.YT.Player('yt-host', opts);
  }
  // יצירת נגן שקט מראש (בלי ניגון) כדי שלחיצה אחת תספיק להתחיל עם קול
  function cueOnly() { if (yt || apiState !== 'ready') return; const it = candidate(); if (it) { current = it; createPlayer(it, false); paintBar(); } }
  function candidate() { if (cfg.auto === 'pick' && cfg.pick) return favs.find((f) => f.id === cfg.pick) || null; if (cfg.auto === 'random' && favs.length) return favs[Math.floor(Math.random() * favs.length)]; return cfg.last || favs[0] || null; }

  function play(it, autoplay) {
    if (!it) return;
    autoplay = autoplay !== false;
    current = { id: it.id, kind: it.kind, title: it.title || (favs.find((f) => same(f, it)) || {}).title || '' };
    nowTitle = ''; statusMsg = ''; cfg.last = current; saveCfg();
    showBar(true); paintBar();
    if (!current.title) fetchTitle(current).then((t) => { if (t && current && same(current, it)) { current.title = t; cfg.last = current; saveCfg(); const f = favs.find((x) => same(x, it)); if (f && !f.title) { f.title = t; saveFavs(); } paintBar(); paintScreen(); } });
    if (apiState !== 'ready') { pending = current; pendingAuto = autoplay; statusMsg = L('טוען את YouTube...', 'Loading YouTube...'); paintBar(); loadApi(); return; }
    if (!yt) { createPlayer(current, autoplay); return; }
    try {
      yt.setVolume(cfg.vol);
      if (current.kind === 'list') { yt.loadPlaylist({ listType: 'playlist', list: current.id }); yt.setLoop(true); yt.setShuffle(!!cfg.shuffle); }
      else yt.loadVideoById(current.id);
      if (!autoplay) setTimeout(() => { try { yt.pauseVideo(); } catch (e) { /* */ } }, 50);
    } catch (e) { setStatus(L('הנגן לא הגיב, נסו שוב', 'The player did not respond, try again')); }
    paintScreen();
  }
  function toggle() { if (!yt) { if (current) play(current); return; } try { if (playing) yt.pauseVideo(); else yt.playVideo(); } catch (e) { /* */ } }
  function next() { if (yt && current && current.kind === 'list') { try { yt.nextVideo(); } catch (e) { /* */ } } }
  // השהיה: לפי המצב האמיתי של הנגן, לא רק לפי הדגל הפנימי (אם אירוע מצב התפספס)
  const ytPlaying = () => { try { const st = yt && yt.getPlayerState ? yt.getPlayerState() : -1; return st === 1 || st === 3; } catch (e) { return false; } };
  function pause() { if (yt && (playing || ytPlaying())) { try { yt.pauseVideo(); } catch (e) { /* */ } playing = false; notify(); } }
  function stop() { if (yt) { try { yt.stopVideo(); } catch (e) { /* */ } } playing = false; notify(); showBar(false); paintScreen(); }
  // כשהמוזיקה מתנגנת, סרטוני המשימות מושתקים אוטומטית (האפליקציה מאזינה לאירוע הזה)
  function notify() { try { document.dispatchEvent(new CustomEvent('music:state', { detail: { playing } })); } catch (e) { /* */ } }
  function setVolume(v) { cfg.vol = Math.max(0, Math.min(100, +v || 0)); saveCfg(); if (yt) { try { yt.setVolume(cfg.vol); } catch (e) { /* */ } } }
  function toggleFav(it) {
    const i = favs.findIndex((f) => same(f, it));
    if (i >= 0) { favs.splice(i, 1); if (cfg.pick === it.id) { cfg.pick = null; if (cfg.auto === 'pick') cfg.auto = 'last'; saveCfg(); } }
    else { const rec = { id: it.id, kind: it.kind, title: it.title || (same(current, it) ? nowTitle : '') || '', addedAt: Date.now() }; favs.unshift(rec); if (!rec.title) fetchTitle(rec).then((t) => { if (t) { rec.title = t; saveFavs(); paintBar(); paintScreen(); } }); }
    saveFavs(); paintBar(); paintScreen();
  }
  // השיר שמתנגן כרגע בתוך פלייליסט, כפריט נפרד
  function nowItem() { try { const d = yt && yt.getVideoData(); if (d && d.video_id) return { id: d.video_id, kind: 'video', title: d.title || '' }; } catch (e) { /* */ } return null; }

  // ---------- פתיחת ערב ----------
  let lastEvening = null;
  function onEveningStart(key) {
    if (key && key === lastEvening) return; lastEvening = key || Date.now();
    if (cfg.auto === 'off') return;
    const it = candidate(); if (it) play(it, true);
  }

  // ---------- מסך ----------
  function render(host) {
    screenHost = host; paintScreen();
  }
  function paintScreen() {
    const host = screenHost; if (!host || !host.isConnected || host.closest('[hidden]')) return;
    const cur = current, nowIn = cur && cur.kind === 'list' ? nowItem() : null;
    const favRows = favs.map((f) => `<div class="mu-row ${same(f, cur) ? 'on' : ''}" data-fid="${esc(f.id)}" data-fkind="${f.kind}">
        <button type="button" class="mu-play" data-mu="playfav">${same(f, cur) && playing ? '⏸' : '▶'}</button>
        <div class="mu-txt"><b>${esc(f.title || f.id)}</b><small>${f.kind === 'list' ? L('פלייליסט', 'Playlist') : L('סרטון', 'Video')}${cfg.auto === 'pick' && cfg.pick === f.id ? ' · ' + L('נפתח בכל ערב', 'Opens every evening') : ''}</small></div>
        <button type="button" class="mu-ico" data-mu="pickfav" title="${L('לנגן בפתיחת ערב', 'Play at evening start')}">${cfg.auto === 'pick' && cfg.pick === f.id ? '🌙' : '🌑'}</button>
        <button type="button" class="mu-ico" data-mu="unfav" title="${L('הסרה מהמועדפים', 'Remove from favorites')}">✕</button></div>`).join('');
    host.innerHTML = `
      <div class="card mu-now">
        <small class="muted">${L('מתנגן עכשיו', 'Now playing')}</small>
        <h2>${cur ? esc(nowTitle || cur.title || cur.id) : L('שקט', 'Quiet')}</h2>
        ${cur && cur.kind === 'list' && cur.title && nowTitle && nowTitle !== cur.title ? `<p class="muted tiny">${L('מתוך', 'From')} ${esc(cur.title)}</p>` : ''}
        ${statusMsg ? `<p class="mu-status">${esc(statusMsg)}</p>` : ''}
        <div class="row gap mu-ctl">
          <button type="button" class="btn primary" data-mu="toggle" ${cur ? '' : 'disabled'}>${playing ? L('⏸ השהיה', '⏸ Pause') : L('▶ נגן', '▶ Play')}</button>
          ${cur && cur.kind === 'list' ? `<button type="button" class="btn ghost" data-mu="next">⏭ ${L('הבא', 'Next')}</button>` : ''}
          ${cur ? `<button type="button" class="btn ghost" data-mu="favcur">${isFav(cur) ? '★' : '☆'} ${cur.kind === 'list' ? L('הפלייליסט', 'Playlist') : L('מועדף', 'Favorite')}</button>` : ''}
          ${nowIn ? `<button type="button" class="btn ghost" data-mu="favnow">${isFav(nowIn) ? '★' : '☆'} ${L('השיר הזה', 'This track')}</button>` : ''}
          ${cur ? `<button type="button" class="btn ghost" data-mu="stop">✕ ${L('סגירת הנגן', 'Close player')}</button>` : ''}
        </div>
        <label class="mu-vol">${L('עוצמה', 'Volume')} <input type="range" min="0" max="100" value="${cfg.vol}" data-mu="vol"></label>
        <label class="mu-chk"><input type="checkbox" data-mu="shuffle" ${cfg.shuffle ? 'checked' : ''}> ${L('ערבוב בפלייליסטים', 'Shuffle playlists')}</label>
      </div>
      <div class="card">
        <h2>${L('הוספה', 'Add')}</h2>
        <p class="muted tiny">${L('מדביקים קישור מ-YouTube או YouTube Music: סרטון, או פלייליסט (מומלץ לערב שלם). שיתוף ← העתקת קישור.', 'Paste a YouTube or YouTube Music link: a video, or a playlist (best for a whole evening). Share → Copy link.')}</p>
        <div class="row gap"><input type="url" id="mu-url" placeholder="https://youtube.com/..." dir="ltr" inputmode="url" autocomplete="off"><button type="button" class="btn primary" data-mu="add">${L('נגן', 'Play')}</button></div>
        <p class="muted tiny" id="mu-add-msg"></p>
      </div>
      <div class="card">
        <h2>${L('מועדפים', 'Favorites')} <small class="muted">${favs.length}</small></h2>
        ${favs.length ? favRows : `<p class="muted tiny">${L('עוד אין. מנגנים משהו ולוחצים ★, או מוסיפים קישור.', 'None yet. Play something and tap ★, or add a link.')}</p>`}
      </div>
      <div class="card">
        <h2>${L('בפתיחת ערב', 'At evening start')}</h2>
        <p class="muted tiny">${L('כשלוחצים ״התחל ערב חדש״, המוזיקה מתחילה לבד:', 'When you tap "Start a new evening", the music starts by itself:')}</p>
        <div class="seg mu-seg">
          <button type="button" data-auto="last" class="${cfg.auto === 'last' ? 'on' : ''}">${L('מה שנוגן לאחרונה', 'Last played')}</button>
          <button type="button" data-auto="random" class="${cfg.auto === 'random' ? 'on' : ''}">${L('אקראי מהמועדפים', 'Random favorite')}</button>
          <button type="button" data-auto="off" class="${cfg.auto === 'off' ? 'on' : ''}">${L('כבוי', 'Off')}</button>
        </div>
        <p class="muted tiny">${cfg.auto === 'pick' && cfg.pick ? L('נבחר מועדף קבוע (🌙 ברשימה). לחיצה על 🌙 שוב מבטלת.', 'A fixed favorite is chosen (🌙 in the list). Tap 🌙 again to clear.') : L('אפשר גם לקבוע מועדף אחד שייפתח תמיד: 🌙 ליד השם ברשימה.', 'You can also fix one favorite that always opens: 🌙 next to its name in the list.')}</p>
      </div>
      <div class="card">
        <h2>${L('חשבון YouTube', 'YouTube account')}</h2>
        <p class="muted tiny">${L('האפליקציה לא מבקשת סיסמה ולא יכולה לקבל אחת: גוגל לא מאפשרת כניסה דרך אפליקציה חיצונית. מתחברים פעם אחת ל-YouTube בדפדפן של הטלפון, והנגן כאן משתמש באותה כניסה. עם YouTube Premium אין פרסומות; בלי מנוי המוזיקה מתנגנת רגיל, עם פרסומות של YouTube.', 'The app never asks for a password and cannot take one: Google does not allow signing in through a third-party app. Sign in to YouTube once in the phone browser and the player here uses that sign-in. With YouTube Premium there are no ads; without it the music plays normally, with YouTube ads.')}</p>
        <button type="button" class="btn ghost" data-mu="login">${L('התחברות ל-YouTube בדפדפן', 'Sign in to YouTube in the browser')}</button>
        <p class="muted tiny">${L('באייפון, אם האפליקציה הותקנה למסך הבית, הכניסה צריכה להיעשות מתוך האפליקציה עצמה (הכפתור למעלה), לא מספארי.', 'On iPhone, if the app is installed on the home screen, sign in from inside the app itself (the button above), not from Safari.')}</p>
        <p class="muted tiny">${L('המוזיקה ממשיכה בין המסכים ובמצב טלוויזיה. כשהטלפון ננעל היא נעצרת: משאירים את המסך דולק (יש הגדרה ב״עוד״).', 'The music keeps playing across screens and in TV mode. It stops when the phone locks: keep the screen on (there is a setting under "More").')}</p>
      </div>`;
    const urlIn = $('#mu-url', host), msg = $('#mu-add-msg', host);
    const add = () => { const it = parse(urlIn.value); if (!it) { msg.textContent = L('זה לא נראה כמו קישור YouTube', 'That does not look like a YouTube link'); return; } urlIn.value = ''; msg.textContent = ''; play(it, true); if (!isFav(it)) toggleFav(it); };
    $('[data-mu=add]', host).addEventListener('click', add);
    urlIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    urlIn.addEventListener('paste', () => setTimeout(() => { if (parse(urlIn.value)) add(); }, 0));
    host.addEventListener('click', onScreenClick);
    $('[data-mu=vol]', host).addEventListener('input', (e) => setVolume(e.target.value));
    $('[data-mu=shuffle]', host).addEventListener('change', (e) => { cfg.shuffle = e.target.checked; saveCfg(); if (yt && current && current.kind === 'list') { try { yt.setShuffle(cfg.shuffle); } catch (err) { /* */ } } });
  }
  function onScreenClick(e) {
    const b = e.target.closest('[data-mu],[data-auto]'); if (!b) return;
    if (b.dataset.auto) { cfg.auto = b.dataset.auto; if (cfg.auto !== 'pick') cfg.pick = null; saveCfg(); paintScreen(); return; }
    const a = b.dataset.mu, row = b.closest('.mu-row'), fav = row ? favs.find((f) => f.id === row.dataset.fid && f.kind === row.dataset.fkind) : null;
    if (a === 'toggle') toggle(); else if (a === 'next') next(); else if (a === 'stop') stop();
    else if (a === 'favcur') { if (current) toggleFav(current); }
    else if (a === 'favnow') { const n = nowItem(); if (n) toggleFav(n); }
    else if (a === 'playfav' && fav) { if (same(fav, current)) toggle(); else play(fav, true); }
    else if (a === 'unfav' && fav) toggleFav(fav);
    else if (a === 'pickfav' && fav) { if (cfg.auto === 'pick' && cfg.pick === fav.id) { cfg.auto = 'last'; cfg.pick = null; } else { cfg.auto = 'pick'; cfg.pick = fav.id; } saveCfg(); paintScreen(); }
    else if (a === 'login') window.open('https://accounts.google.com/ServiceLogin?continue=' + encodeURIComponent('https://www.youtube.com/'), '_blank', 'noopener');
    setTimeout(paintScreen, 300);
  }

  function init() {
    // טוענים את YouTube מראש רק אם יש מה לנגן, כדי שפתיחת ערב תתחיל עם קול בלחיצה אחת
    if (cfg.auto !== 'off' && candidate()) { ensureBar(); setTimeout(loadApi, 1500); }
  }
  function hasSomething() { return favs.length > 0 || !!cfg.last; }
  window.Music = { init, render, play, pause, stop, toggle, onEveningStart, parse, hasSomething, get current() { return current; }, get playing() { return playing || ytPlaying(); } };
})();
