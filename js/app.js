/* קטיפה – לוגיקת האפליקציה. הכול נשמר ב-localStorage במכשיר בלבד. */
(() => {
  'use strict';
  const KEY = 'ktifa.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const DEFAULT = () => ({
    setupDone: false,
    partners: { a: { name: '', g: 'm' }, b: { name: '', g: 'f' } },
    dom: 'a', roleMode: 'fixed', safeword: 'אדום',
    limits: { a: {}, b: {} }, maxLevel: { a: 3, b: 3 }, includeMaybe: false,
    pinHash: null, keepAwake: true,
    favorites: [], hidden: [], custom: [], session: null,
  });
  let S = load();
  function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); return j ? Object.assign(DEFAULT(), j) : DEFAULT(); } catch { return DEFAULT(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* מלא */ } }

  // ---------- מילון ----------
  const sub = () => (S.dom === 'a' ? 'b' : 'a');
  const pname = (k) => S.partners[k].name.trim();
  const roleName = (role) => {
    const k = role === 'D' ? S.dom : sub();
    const p = S.partners[k];
    if (pname(k)) return pname(k);
    if (role === 'D') return p.g === 'm' ? 'המוביל' : 'המובילה';
    return p.g === 'm' ? 'המובל' : 'המובלת';
  };
  const ctx = () => ({ D: roleName('D'), S: roleName('S'), dg: S.partners[S.dom].g, sg: S.partners[sub()].g });
  function render(text, c = ctx()) {
    return esc(text).replace(/\{(D|S|[ds]):?([^{}]*)\}/g, (m, k, rest) => {
      if (k === 'D') return `<b>${c.D}</b>`;
      if (k === 'S') return `<b>${c.S}</b>`;
      const [m1, f1 = ''] = rest.split('|');
      const g = k === 'd' ? c.dg : c.sg;
      return g === 'm' ? m1 : f1;
    });
  }
  const catOf = (id) => CATEGORIES.find((c) => c.id === id);
  const allCards = () => CARDS.concat(S.custom);
  const cardById = (id) => allCards().find((c) => c.id === id);

  // ---------- גבולות ----------
  function catStatus(catId) {
    if (catId === AFTERCARE_ID) return 'yes';
    const a = S.limits.a[catId] || 'maybe', b = S.limits.b[catId] || 'maybe';
    if (a === 'no' || b === 'no') return 'no';
    if (a === 'yes' && b === 'yes') return 'yes';
    return 'maybe';
  }
  const catAllowed = (catId) => { const s = catStatus(catId); return s === 'yes' || (s === 'maybe' && S.includeMaybe); };
  const maxLevel = () => Math.min(S.maxLevel.a || 3, S.maxLevel.b || 3);
  function pool() {
    const ml = maxLevel();
    return allCards().filter((c) => c.cat !== AFTERCARE_ID && catAllowed(c.cat) && c.lvl <= ml && !S.hidden.includes(c.id));
  }

  // ---------- ניווט ----------
  const SCREENS = ['lock', 'setup', 'home', 'play', 'dice', 'timer', 'more', 'editor', 'cardform', 'limits', 'safety'];
  const TABS = { home: 'home', random: 'play', dice: 'dice', timer: 'timer', more: 'more' };
  let current = 'home';
  function show(name) {
    current = name;
    SCREENS.forEach((s) => { $('#scr-' + s).hidden = s !== name; });
    const tabbarOn = !['lock', 'setup'].includes(name);
    $('#tabbar').hidden = !tabbarOn;
    $$('#tabbar button').forEach((b) => b.classList.toggle('active', TABS[b.dataset.tab] === name && !(name === 'play' && b.dataset.tab === 'random' && playMode === 'session')));
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'more') renderMore();
    if (name === 'editor') renderEditor();
    if (name === 'limits') renderLimitsScreen();
    if (name === 'dice') renderDice(false);
  }
  $$('#tabbar button').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tab;
    if (t === 'random') return startRandom();
    show(TABS[t]);
  }));
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.go;
    if (g === 'random') return startRandom();
    if (g === 'partners') return startSetup(1, true);
    if (g === 'pin') return pinDialog();
    show(g);
  }));
  $$('[data-stop]').forEach((b) => b.addEventListener('click', openStop));

  // ---------- דיאלוג ----------
  function dialog(html, buttons) {
    const card = $('#dlg-card');
    card.innerHTML = html + '<div class="stack dlg-btns"></div>';
    const wrap = $('.dlg-btns', card);
    buttons.forEach(({ label, cls = 'ghost', onClick }) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls; b.textContent = label;
      b.addEventListener('click', () => { const keep = onClick && onClick(card); if (keep !== true) $('#dlg').hidden = true; });
      wrap.appendChild(b);
    });
    $('#dlg').hidden = false;
  }

  // ---------- נעילה ----------
  async function sha(s) {
    if (crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ktifa:' + s));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const ch of 'ktifa:' + s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 'x' + h;
  }
  let pinBuf = '', pinResolve = null;
  function buildPad() {
    const pad = $('#pinpad'); pad.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].forEach((k) => {
      const b = document.createElement('button'); b.textContent = k; b.disabled = !k;
      b.addEventListener('click', () => {
        if (k === '⌫') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
        $$('#pin-dots i').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length));
        if (pinBuf.length === 4) { const v = pinBuf; pinBuf = ''; setTimeout(() => { $$('#pin-dots i').forEach((d) => d.classList.remove('on')); pinResolve && pinResolve(v); }, 120); }
      });
      pad.appendChild(b);
    });
  }
  function askPin(msg) { $('#lock-msg').textContent = msg; pinBuf = ''; show('lock'); return new Promise((r) => { pinResolve = r; }); }
  async function unlockFlow() {
    let msg = 'הזינו קוד';
    for (;;) {
      const v = await askPin(msg);
      if (await sha(v) === S.pinHash) return;
      msg = 'קוד שגוי, נסו שוב'; navigator.vibrate && navigator.vibrate(200);
    }
  }
  $('#lock-forgot').addEventListener('click', () => confirmWipe());
  async function pinDialog() {
    if (S.pinHash) {
      dialog('<h2>קוד נעילה</h2><p>הקוד פעיל. האפליקציה נפתחת רק איתו.</p>', [
        { label: 'הסרת הקוד', cls: 'danger', onClick: () => { S.pinHash = null; save(); renderMore(); } },
        { label: 'סגירה' },
      ]);
      return;
    }
    const v1 = await askPin('בחרו קוד בן 4 ספרות');
    const v2 = await askPin('עוד פעם, לאימות');
    if (v1 !== v2) { dialog('<h2>לא תואם</h2><p>הקודים לא היו זהים. נסו שוב.</p>', [{ label: 'סגירה' }]); show('more'); return; }
    S.pinHash = await sha(v1); save(); show('more');
  }

  // ---------- מחיקה ----------
  function confirmWipe() {
    dialog('<h2>למחוק הכול?</h2><p>שמות, גבולות, כרטיסים שהוספתם, מועדפים וקוד הנעילה יימחקו מהמכשיר. אין דרך חזרה.</p>', [
      { label: 'כן, מחק הכול', cls: 'danger', onClick: () => { localStorage.removeItem(KEY); S = DEFAULT(); location.reload(); } },
      { label: 'ביטול' },
    ]);
  }
  $('#btn-wipe').addEventListener('click', confirmWipe);

  // ---------- הגדרה ראשונית ----------
  let setupStep = 0, setupOnlyPartners = false, limitsFor = null, draft = null;
  const STEPS = ['ברוכים הבאים', 'מי אתם', 'גבולות', 'גבולות', 'סיכום'];
  function startSetup(step = 0, onlyPartners = false) {
    setupOnlyPartners = onlyPartners; draft = JSON.parse(JSON.stringify({ partners: S.partners, dom: S.dom, roleMode: S.roleMode, safeword: S.safeword }));
    setupStep = step; show('setup'); renderSetup();
  }
  function renderSetup() {
    $('#setup-steps').innerHTML = setupOnlyPartners ? '' : STEPS.map((s, i) => `<span class="${i === setupStep ? 'on' : i < setupStep ? 'done' : ''}">${s}</span>`).join('');
    const body = $('#setup-body');
    if (setupStep === 0) {
      body.innerHTML = `
        <div class="home-emblem"><svg class="il"><use href="#il-flame"/></svg></div>
        <h1 class="brand center">קטיפה</h1>
        <p class="lead">משחק ערב לשניכם: משימות, קוביות, טיימר. חפיסה שמכבדת את הגבולות של שניכם, ומילת עצירה שעוצרת הכול.</p>
        <div class="consent">
          <label><input type="checkbox" id="ck1"> שנינו מעל גיל 18.</label>
          <label><input type="checkbox" id="ck2"> שנינו כאן מרצון, וכל אחד יכול לעצור בכל רגע בלי להסביר.</label>
          <label><input type="checkbox" id="ck3"> מה שלא סוכם מראש לא קורה הערב.</label>
        </div>
        <button class="btn primary big" id="su-next" disabled>מתחילים</button>
        <p class="muted tiny">הכול נשמר רק בטלפון הזה. אין חשבון, אין שרת, אין איסוף נתונים.</p>`;
      const upd = () => { $('#su-next').disabled = !($('#ck1').checked && $('#ck2').checked && $('#ck3').checked); };
      $$('.consent input', body).forEach((i) => i.addEventListener('change', upd));
      $('#su-next').addEventListener('click', () => { setupStep = 1; renderSetup(); });
    } else if (setupStep === 1) {
      const p = draft.partners;
      body.innerHTML = `
        <h1>מי אתם</h1>
        <div class="form">
          <fieldset><legend>בן/בת זוג א׳</legend>
            <input id="pa-name" placeholder="שם" value="${esc(p.a.name)}">
            <div class="seg" id="pa-g"><button type="button" data-v="m">זכר</button><button type="button" data-v="f">נקבה</button></div>
          </fieldset>
          <fieldset><legend>בן/בת זוג ב׳</legend>
            <input id="pb-name" placeholder="שם" value="${esc(p.b.name)}">
            <div class="seg" id="pb-g"><button type="button" data-v="m">זכר</button><button type="button" data-v="f">נקבה</button></div>
          </fieldset>
          <fieldset><legend>מי מוביל הערב</legend>
            <div class="seg" id="su-dom"><button type="button" data-v="a">א׳</button><button type="button" data-v="b">ב׳</button></div>
            <label class="check"><input type="checkbox" id="su-rand" ${draft.roleMode === 'random' ? 'checked' : ''}> להגריל מחדש בכל ערב</label>
          </fieldset>
          <fieldset><legend>מילת העצירה</legend>
            <input id="su-safe" value="${esc(draft.safeword)}" placeholder="אדום">
            <p class="muted tiny">מילה שלא תגידו במקרה. ״אדום״ = הכול עוצר. ״צהוב״ = להאט ולבדוק.</p>
          </fieldset>
        </div>
        <button class="btn primary big" id="su-next">${setupOnlyPartners ? 'שמירה' : 'הלאה: הגבולות של כל אחד'}</button>`;
      seg($('#pa-g'), p.a.g, (v) => { p.a.g = v; }); seg($('#pb-g'), p.b.g, (v) => { p.b.g = v; }); seg($('#su-dom'), draft.dom, (v) => { draft.dom = v; });
      $('#su-next').addEventListener('click', () => {
        p.a.name = $('#pa-name').value.trim(); p.b.name = $('#pb-name').value.trim();
        draft.safeword = $('#su-safe').value.trim() || 'אדום'; draft.roleMode = $('#su-rand').checked ? 'random' : 'fixed';
        Object.assign(S, draft); save();
        if (setupOnlyPartners) return show('more');
        setupStep = 2; limitsFor = 'a'; renderSetup();
      });
    } else if (setupStep === 2 || setupStep === 3) {
      limitsFor = setupStep === 2 ? 'a' : 'b';
      body.innerHTML = '';
      renderLimitsEditor(body, limitsFor, () => { setupStep++; renderSetup(); });
    } else {
      body.innerHTML = `<h1>מה מותר הערב</h1><p class="muted">רק מה ששניכם סימנתם ״כן״ נכנס למשחק. לא מוצג מי סימן מה.</p>
        <div class="allowed-list">${summaryHtml()}</div>
        <label class="check big"><input type="checkbox" id="su-maybe" ${S.includeMaybe ? 'checked' : ''}> לכלול גם קטגוריות ש״אולי״</label>
        <p class="muted tiny">אפשר לשנות הכול אחר כך ב״עוד״.</p>
        <button class="btn primary big" id="su-done">סיימנו, לערב</button>`;
      $('#su-maybe').addEventListener('change', (e) => { S.includeMaybe = e.target.checked; save(); $('.allowed-list', body).innerHTML = summaryHtml(); });
      $('#su-done').addEventListener('click', () => { S.setupDone = true; save(); show('home'); });
    }
  }
  function seg(el, val, onChange) {
    const set = (v) => $$('button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    set(val);
    $$('button', el).forEach((b) => b.addEventListener('click', () => { set(b.dataset.v); onChange(b.dataset.v); }));
  }
  function summaryHtml() {
    return CATEGORIES.map((c) => {
      const s = catStatus(c.id), on = catAllowed(c.id);
      const label = s === 'yes' ? 'במשחק' : s === 'no' ? 'מחוץ למשחק' : on ? 'במשחק (״אולי״)' : 'רק אם מסמנים ״אולי״';
      return `<div class="allowed-row ${on ? 'on' : 'off'}">${illus(c.img)}<span>${c.name}</span><em>${label}</em></div>`;
    }).join('') + `<div class="allowed-row on">${illus('stopwatch')}<span>עוצמה מרבית</span><em>${maxLevel()} מתוך 3</em></div>`;
  }

  // עורך גבולות לבן/בת זוג אחד – עם מסך "מסור/י את הטלפון"
  function renderLimitsEditor(host, who, onDone) {
    const p = S.partners[who], name = p.name || (who === 'a' ? 'בן/בת זוג א׳' : 'בן/בת זוג ב׳');
    const other = S.partners[who === 'a' ? 'b' : 'a'];
    host.innerHTML = `<div class="handoff"><div class="home-emblem">${illus('phone')}</div>
      <h1>${esc(name)}, תורך</h1>
      <p class="lead">${esc(other.name || 'בן/בת הזוג')} לא ${other.g === 'm' ? 'מסתכל' : 'מסתכלת'} עכשיו. ${p.g === 'm' ? 'סמן' : 'סמני'} לבד מה בא לך, מה אולי, ומה בשום אופן לא. התשובות שלך לא יוצגו, רק החיתוך של שניכם.</p>
      <button class="btn primary big" id="lm-start">זה אני, ${esc(p.name || '')}</button></div>`;
    $('#lm-start', host).addEventListener('click', () => {
      const lim = S.limits[who];
      host.innerHTML = `<h1>${esc(name)}: הגבולות שלי</h1>
        <div class="limits">${CATEGORIES.map((c) => `
          <div class="limit-row" data-cat="${c.id}">
            <div class="limit-head">${illus(c.img)}<div><b>${c.name}</b><small>${c.desc}</small>${c.safe ? `<small class="safe-note">${c.safe}</small>` : ''}</div></div>
            <div class="seg tri"><button type="button" data-v="yes">כן</button><button type="button" data-v="maybe">אולי</button><button type="button" data-v="no">לא</button></div>
          </div>`).join('')}</div>
        <h2>עד איזו עוצמה</h2>
        <div class="seg" id="lm-max"><button type="button" data-v="1">1 חימום</button><button type="button" data-v="2">2 בינוני</button><button type="button" data-v="3">3 הכול</button></div>
        <button class="btn primary big" id="lm-done">סיימתי, ${p.g === 'm' ? 'מסתיר' : 'מסתירה'} את התשובות</button>`;
      $$('.limit-row', host).forEach((row) => seg($('.seg', row), lim[row.dataset.cat] || 'maybe', (v) => { lim[row.dataset.cat] = v; save(); }));
      seg($('#lm-max', host), String(S.maxLevel[who] || 3), (v) => { S.maxLevel[who] = +v; save(); });
      $('#lm-done', host).addEventListener('click', () => { CATEGORIES.forEach((c) => { if (!lim[c.id]) lim[c.id] = 'maybe'; }); save(); onDone(); });
    });
  }
  function renderLimitsScreen() {
    const host = $('#limits-body');
    host.innerHTML = `<p class="muted">כל אחד עורך לבד. מוצג רק החיתוך.</p>
      <div class="allowed-list">${summaryHtml()}</div>
      <div class="stack">
        <button class="btn primary" id="lim-a">הגבולות של ${esc(S.partners.a.name || 'א׳')}</button>
        <button class="btn primary" id="lim-b">הגבולות של ${esc(S.partners.b.name || 'ב׳')}</button>
      </div>`;
    $('#lim-a').addEventListener('click', () => renderLimitsEditor(host, 'a', renderLimitsScreen));
    $('#lim-b').addEventListener('click', () => renderLimitsEditor(host, 'b', renderLimitsScreen));
  }

  // ---------- בית ----------
  function renderHome() {
    const c = ctx();
    $('#home-sub').textContent = `מילת העצירה: ${S.safeword}`;
    $('#home-roles').innerHTML = `<div class="role dom">${illus('key')}<small>${c.dg === 'm' ? 'מוביל' : 'מובילה'}</small><b>${c.D}</b></div>
      <div class="role sub">${illus('collar')}<small>${c.sg === 'm' ? 'מובל' : 'מובלת'}</small><b>${c.S}</b></div>`;
    const ses = S.session;
    $('#btn-resume').hidden = !(ses && ses.idx < ses.cards.length);
    if (ses) $('#btn-resume').textContent = `המשך ערב (${Math.min(ses.idx + 1, ses.cards.length)}/${ses.cards.length})`;
    const n = pool().length;
    $('#home-allowed').innerHTML = `<div class="chips">${CATEGORIES.filter((k) => catAllowed(k.id)).map((k) => `<span class="chip">${k.name}</span>`).join('') || '<span class="chip off">אין קטגוריות מותרות</span>'}</div>
      <p class="muted tiny">${n} משימות זמינות · עוצמה עד ${maxLevel()}</p>`;
  }
  $('#btn-swap').addEventListener('click', () => { S.dom = sub(); save(); renderHome(); if (S.session) { /* הכרטיסים מתרנדרים מחדש בעת הצגה */ } });
  $('#btn-new').addEventListener('click', () => {
    const go = () => { if (S.roleMode === 'random') S.dom = Math.random() < 0.5 ? 'a' : 'b'; buildSession(); startPlay('session'); };
    if (S.session && S.session.idx < S.session.cards.length) dialog('<h2>ערב חדש?</h2><p>הערב הנוכחי יימחק ותיבנה חפיסה חדשה.</p>', [{ label: 'כן, ערב חדש', cls: 'primary', onClick: go }, { label: 'ביטול' }]);
    else go();
  });
  $('#btn-resume').addEventListener('click', () => startPlay('session'));

  function buildSession() {
    const p = shuffle(pool());
    const pick = (lvl, n) => { const out = []; for (const c of p) { if (c.lvl === lvl && !used.has(c.id) && out.length < n) { out.push(c); used.add(c.id); } } return out; };
    const used = new Set();
    const plan = [[1, 3], [2, 4], [3, 4]];
    let seq = [];
    plan.forEach(([l, n]) => { seq = seq.concat(pick(l, n)); });
    // השלמה אם חסר ברמות מסוימות
    const target = Math.min(11, p.length);
    for (const c of p) { if (seq.length >= target) break; if (!used.has(c.id)) { seq.push(c); used.add(c.id); } }
    seq.sort((x, y) => x.lvl - y.lvl);
    // מועדפים קודם בתוך כל רמה? לא – אקראי. אבל מבטיחים שלפחות מועדף אחד נכנס אם קיים.
    const fav = p.find((c) => S.favorites.includes(c.id) && !used.has(c.id));
    if (fav && seq.length) { const i = seq.findIndex((c) => c.lvl === fav.lvl); if (i >= 0) seq[i] = fav; }
    const after = shuffle(CARDS.filter((c) => c.cat === AFTERCARE_ID))[0];
    S.session = { cards: seq.map((c) => c.id).concat(after ? [after.id] : []), idx: 0, startedAt: Date.now() };
    save();
  }

  // ---------- משחק ----------
  let playMode = 'session', randomCard = null, cardTimer = null;
  function startPlay(mode) { playMode = mode; show('play'); renderPlay(); requestWake(); }
  function startRandom() {
    const p = pool();
    if (!p.length) { dialog('<h2>אין משימות</h2><p>שניכם צריכים לסמן לפחות קטגוריה אחת ״כן״, או להפעיל ״לכלול אולי״.</p>', [{ label: 'לגבולות', cls: 'primary', onClick: () => show('limits') }, { label: 'סגירה' }]); return; }
    let c; do { c = p[Math.floor(Math.random() * p.length)]; } while (p.length > 1 && randomCard && c.id === randomCard.id);
    randomCard = c; startPlay('random');
  }
  function currentCard() {
    if (playMode === 'random') return randomCard;
    const s = S.session; if (!s) return null;
    return cardById(s.cards[s.idx]) || null;
  }
  function cardHtml(c, big = true) {
    const cat = c.cat === AFTERCARE_ID ? { name: 'אחרי', img: 'blanket' } : catOf(c.cat);
    const to = c.to === 'B' ? 'לשניכם' : 'ל' + roleName(c.to);
    const dots = c.lvl ? '<span class="lvl">' + [1, 2, 3].map((i) => `<i class="${i <= c.lvl ? 'on' : ''}"></i>`).join('') + '</span>' : '';
    return `<article class="card cat-${c.cat} ${big ? 'big' : ''}">
      <header><span class="chip to">${esc(to)}</span><span class="chip cat">${cat.name}</span>${dots}</header>
      <div class="art">${illus(c.img || cat.img)}</div>
      <p class="text">${render(c.text)}</p>
      ${c.safe ? `<p class="safe">⚠ ${esc(c.safe)}</p>` : ''}
      ${c.min ? `<button class="btn timer-btn" data-min="${c.min}">${illus('stopwatch')} ${c.min} דקות</button>` : ''}
      <div class="card-timer" hidden><span class="t"></span><button class="btn small ghost stop-t">עצירת טיימר</button></div>
    </article>`;
  }
  function renderPlay() {
    stopCardTimer();
    const c = currentCard();
    const host = $('#card-host'), acts = $('#play-actions');
    if (playMode === 'session') {
      const s = S.session;
      if (!s || s.idx >= s.cards.length) {
        $('#play-progress').textContent = '';
        host.innerHTML = `<div class="done"><div class="home-emblem">${illus('heart')}</div><h1>זה היה הערב</h1><p class="lead">מים, שמיכה, ומילה טובה אחד לשני. הערב הבא מחכה כשתרצו.</p></div>`;
        acts.innerHTML = `<button class="btn primary big" id="pa-home">לדף הבית</button>`;
        $('#pa-home').addEventListener('click', () => { S.session = null; save(); show('home'); });
        return;
      }
      $('#play-progress').textContent = `${s.idx + 1} / ${s.cards.length}`;
    } else $('#play-progress').textContent = 'קלף אקראי';
    if (!c) { S.session = null; save(); return show('home'); }
    host.innerHTML = cardHtml(c);
    const fav = S.favorites.includes(c.id);
    acts.innerHTML = playMode === 'session'
      ? `<button class="btn primary big" id="pa-done">בוצע, הבא</button>
         <div class="row gap">
           <button class="btn ghost" id="pa-skip">דילוג</button>
           <button class="btn ghost ${fav ? 'on' : ''}" id="pa-fav">${fav ? '★ מועדף' : '☆ מועדף'}</button>
           <button class="btn ghost" id="pa-hide">לא שוב</button>
         </div>`
      : `<button class="btn primary big" id="pa-another">קלף אחר</button>
         <div class="row gap">
           <button class="btn ghost ${fav ? 'on' : ''}" id="pa-fav">${fav ? '★ מועדף' : '☆ מועדף'}</button>
           <button class="btn ghost" id="pa-hide">לא שוב</button>
         </div>`;
    const next = () => { S.session.idx++; save(); renderPlay(); };
    $('#pa-done') && $('#pa-done').addEventListener('click', next);
    $('#pa-skip') && $('#pa-skip').addEventListener('click', () => {
      // מחליפים בכרטיס אחר מאותה רמה שלא בערב, אם יש
      const s = S.session, alt = shuffle(pool()).find((x) => x.lvl === c.lvl && !s.cards.includes(x.id));
      if (alt) { s.cards[s.idx] = alt.id; save(); renderPlay(); } else next();
    });
    $('#pa-another') && $('#pa-another').addEventListener('click', startRandom);
    $('#pa-fav').addEventListener('click', () => { toggleIn(S.favorites, c.id); save(); renderPlay(); });
    $('#pa-hide').addEventListener('click', () => dialog('<h2>להסתיר את הכרטיס?</h2><p>הוא לא יופיע יותר. אפשר להחזיר אותו מ״החפיסה״.</p>', [
      { label: 'הסתרה', cls: 'danger', onClick: () => { toggleIn(S.hidden, c.id, true); save(); if (playMode === 'session') { const s = S.session; const alt = shuffle(pool()).find((x) => x.lvl === c.lvl && !s.cards.includes(x.id)); if (alt) s.cards[s.idx] = alt.id; else s.cards.splice(s.idx, 1); save(); renderPlay(); } else startRandom(); } },
      { label: 'ביטול' }]));
    const tb = $('.timer-btn', host);
    if (tb) tb.addEventListener('click', () => startCardTimer(+tb.dataset.min * 60, host));
    $('.stop-t', host).addEventListener('click', stopCardTimer);
  }
  function toggleIn(arr, id, force) { const i = arr.indexOf(id); if (i >= 0 && force !== true) arr.splice(i, 1); else if (i < 0) arr.push(id); }
  $('#play-back').addEventListener('click', () => show('home'));
  $('#play-stop').addEventListener('click', openStop);

  function startCardTimer(sec, host) {
    stopCardTimer();
    const box = $('.card-timer', host), t = $('.t', box); box.hidden = false; $('.timer-btn', host).hidden = true;
    const end = Date.now() + sec * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      t.textContent = fmt(left);
      if (left <= 0) { stopCardTimer(); t.textContent = 'הזמן נגמר'; chime(); }
    };
    tick(); cardTimer = setInterval(tick, 250);
  }
  function stopCardTimer() { if (cardTimer) { clearInterval(cardTimer); cardTimer = null; } }

  // ---------- עצור ----------
  function openStop() { $('#stop-safeword').textContent = S.safeword; $('#stop-overlay').hidden = false; navigator.vibrate && navigator.vibrate([80, 40, 80]); timerPause(); stopCardTimer(); }
  $('#stop-resume').addEventListener('click', () => { $('#stop-overlay').hidden = true; });
  $('#stop-aftercare').addEventListener('click', () => {
    $('#stop-overlay').hidden = true;
    const after = shuffle(CARDS.filter((c) => c.cat === AFTERCARE_ID))[0];
    S.session = { cards: [after.id], idx: 0, startedAt: Date.now() }; save(); startPlay('session');
  });
  $('#stop-end').addEventListener('click', () => { $('#stop-overlay').hidden = true; S.session = null; save(); show('home'); });

  // ---------- קוביות ----------
  let diceResult = null, rolling = false;
  function diceSets() {
    const act = DICE.action.filter((a) => !a.cat || catAllowed(a.cat));
    return { action: act.length ? act : DICE.action.filter((a) => !a.cat), body: DICE.body, time: DICE.time };
  }
  function renderDice(animate) {
    const sets = diceSets();
    const r = diceResult || { action: sets.action[0], body: sets.body[0], time: sets.time[0] };
    $('#dice-row').innerHTML = [['action', 'פעולה', r.action.img || 'hand'], ['body', 'איפה', 'figure'], ['time', 'כמה', 'stopwatch']].map(([k, label, img]) =>
      `<div class="die ${animate ? 'spin' : ''}" data-k="${k}">${illus(img)}<small>${label}</small><b>${esc(r[k].t)}</b></div>`).join('');
    $('#dice-sentence').innerHTML = diceResult ? `<b>${roleName('D')}</b>: ${esc(r.action.t)} <b>${esc(r.body.t)}</b> של ${roleName('S')}, ${esc(r.time.t)}.` : 'לחצו ״גלגלו״.';
    $('#dice-timer').hidden = !(diceResult && r.time.sec);
  }
  $('#dice-roll').addEventListener('click', () => {
    if (rolling) return; rolling = true;
    const sets = diceSets(); const pick = (a) => a[Math.floor(Math.random() * a.length)];
    let n = 0; const iv = setInterval(() => {
      diceResult = { action: pick(sets.action), body: pick(sets.body), time: pick(sets.time) }; renderDice(true);
      if (++n >= 8) { clearInterval(iv); rolling = false; renderDice(false); navigator.vibrate && navigator.vibrate(30); }
    }, 90);
  });
  $('#dice-timer').addEventListener('click', () => { if (diceResult && diceResult.time.sec) { timerSet(diceResult.time.sec); show('timer'); timerStart(); } });

  // ---------- טיימר ----------
  let tTotal = 60, tLeft = 60, tEnd = null, tIv = null;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const ARC = 2 * Math.PI * 46;
  function timerDraw() { $('#timer-face').textContent = fmt(tLeft); $('#timer-arc').style.strokeDashoffset = ARC * (1 - (tTotal ? tLeft / tTotal : 0)); $('#timer-start').textContent = tIv ? 'השהיה' : (tLeft < tTotal && tLeft > 0 ? 'המשך' : 'התחל'); }
  function timerSet(sec) { timerPause(); tTotal = tLeft = sec; timerDraw(); }
  function timerStart() {
    if (tLeft <= 0) tLeft = tTotal;
    tEnd = Date.now() + tLeft * 1000;
    tIv = setInterval(() => { tLeft = Math.max(0, Math.round((tEnd - Date.now()) / 1000)); timerDraw(); if (tLeft <= 0) { timerPause(); chime(); } }, 200);
    timerDraw(); requestWake();
  }
  function timerPause() { if (tIv) { clearInterval(tIv); tIv = null; } timerDraw(); }
  $('#timer-start').addEventListener('click', () => (tIv ? timerPause() : timerStart()));
  $('#timer-reset').addEventListener('click', () => timerSet(tTotal));
  (() => {
    const host = $('#timer-presets');
    [[30, '30 שנ׳'], [60, '1 דק׳'], [120, '2 דק׳'], [180, '3 דק׳'], [300, '5 דק׳'], [600, '10 דק׳'], [900, '15 דק׳']].forEach(([s, l]) => {
      const b = document.createElement('button'); b.className = 'btn ghost small'; b.textContent = l; b.addEventListener('click', () => timerSet(s)); host.appendChild(b);
    });
    $('#timer-arc').style.strokeDasharray = ARC; timerDraw();
  })();
  function chime() {
    navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]);
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach((t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 660; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.3); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.32); });
    } catch { /* אין שמע */ }
  }

  // ---------- מסך דולק ----------
  let wake = null;
  async function requestWake() {
    if (!S.keepAwake || !('wakeLock' in navigator)) return;
    try { if (!wake || wake.released) { wake = await navigator.wakeLock.request('screen'); } } catch { /* נדחה */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ['play', 'timer', 'dice'].includes(current)) requestWake(); });

  // ---------- עוד ----------
  function renderMore() {
    $('#opt-awake').checked = S.keepAwake; $('#opt-maybe').checked = S.includeMaybe;
    $('#pin-label').textContent = S.pinHash ? 'קוד נעילה: פעיל' : 'קוד נעילה: כבוי';
  }
  $('#opt-awake').addEventListener('change', (e) => { S.keepAwake = e.target.checked; save(); });
  $('#opt-maybe').addEventListener('change', (e) => { S.includeMaybe = e.target.checked; save(); });

  // ---------- עורך חפיסה ----------
  let edFilter = 'all';
  function renderEditor() {
    const f = $('#editor-filters');
    f.innerHTML = [['all', 'הכול'], ['fav', '★ מועדפים'], ['hidden', 'מוסתרים'], ['custom', 'שלנו']].concat(CATEGORIES.map((c) => [c.id, c.name])).map(([k, l]) => `<button class="chip ${edFilter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('');
    $$('button', f).forEach((b) => b.addEventListener('click', () => { edFilter = b.dataset.f; renderEditor(); }));
    let list = allCards();
    if (edFilter === 'fav') list = list.filter((c) => S.favorites.includes(c.id));
    else if (edFilter === 'hidden') list = list.filter((c) => S.hidden.includes(c.id));
    else if (edFilter === 'custom') list = list.filter((c) => c.id.startsWith('u_'));
    else if (edFilter !== 'all') list = list.filter((c) => c.cat === edFilter);
    $('#editor-list').innerHTML = list.map((c) => {
      const cat = c.cat === AFTERCARE_ID ? { name: 'אחרי', img: 'blanket' } : catOf(c.cat);
      const hid = S.hidden.includes(c.id), fav = S.favorites.includes(c.id);
      return `<div class="ed-row ${hid ? 'hid' : ''}" data-id="${c.id}">
        <div class="ed-art">${illus(c.img || cat.img)}</div>
        <div class="ed-main"><small>${cat.name} · עוצמה ${c.lvl || 'אחרי'} · ${c.to === 'B' ? 'שניכם' : c.to === 'D' ? 'מוביל/ה' : 'מובל/ת'}</small><p>${render(c.text)}</p></div>
        <div class="ed-btns">
          <button class="icon ${fav ? 'on' : ''}" data-act="fav" title="מועדף">${fav ? '★' : '☆'}</button>
          <button class="icon" data-act="hide" title="${hid ? 'החזרה' : 'הסתרה'}">${hid ? '↩' : '🚫'}</button>
          ${c.id.startsWith('u_') ? `<button class="icon" data-act="edit" title="עריכה">✎</button><button class="icon" data-act="del" title="מחיקה">🗑</button>` : ''}
        </div></div>`;
    }).join('') || '<p class="muted center">אין כרטיסים בסינון הזה.</p>';
    $$('.ed-row', $('#editor-list')).forEach((row) => $$('button', row).forEach((b) => b.addEventListener('click', () => {
      const id = row.dataset.id, act = b.dataset.act;
      if (act === 'fav') toggleIn(S.favorites, id);
      if (act === 'hide') toggleIn(S.hidden, id);
      if (act === 'edit') return openCardForm(cardById(id));
      if (act === 'del') return dialog('<h2>למחוק את הכרטיס?</h2>', [{ label: 'מחיקה', cls: 'danger', onClick: () => { S.custom = S.custom.filter((c) => c.id !== id); save(); renderEditor(); } }, { label: 'ביטול' }]);
      save(); renderEditor();
    })));
  }
  $('#editor-add').addEventListener('click', () => openCardForm(null));
  let cf = null;
  function openCardForm(card) {
    cf = card ? JSON.parse(JSON.stringify(card)) : { id: 'u_' + Date.now().toString(36), cat: CATEGORIES[0].id, lvl: 1, to: 'D', img: 'heart', text: '', min: 0 };
    $('#cardform-title').textContent = card ? 'עריכת כרטיס' : 'כרטיס חדש';
    const sel = $('#cf-cat'); sel.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === cf.cat ? 'selected' : ''}>${c.name}</option>`).join('') + `<option value="${AFTERCARE_ID}" ${cf.cat === AFTERCARE_ID ? 'selected' : ''}>אחרי</option>`;
    sel.onchange = () => { cf.cat = sel.value; if (cf.cat === AFTERCARE_ID) cf.lvl = 0; preview(); };
    seg($('#cf-lvl'), String(cf.lvl || 1), (v) => { cf.lvl = +v; preview(); });
    seg($('#cf-to'), cf.to, (v) => { cf.to = v; preview(); });
    $('#cf-min').value = cf.min || ''; $('#cf-min').oninput = (e) => { cf.min = +e.target.value || 0; preview(); };
    const ip = $('#cf-img'); ip.innerHTML = Object.keys(ILLUSTRATIONS).map((k) => `<button type="button" class="${k === cf.img ? 'on' : ''}" data-v="${k}">${illus(k)}</button>`).join('');
    $$('button', ip).forEach((b) => b.addEventListener('click', () => { cf.img = b.dataset.v; $$('button', ip).forEach((x) => x.classList.toggle('on', x === b)); preview(); }));
    $('#cf-text').value = cf.text; $('#cf-text').oninput = (e) => { cf.text = e.target.value; preview(); };
    const preview = () => { $('#cf-preview').innerHTML = cf.text.trim() ? cardHtml(cf, false) : '<p class="muted center">הטקסט יופיע כאן כפי שייראה במשחק.</p>'; };
    preview(); show('cardform');
  }
  $('#cardform-save').addEventListener('click', () => {
    if (!cf.text.trim()) { dialog('<h2>חסר טקסט</h2>', [{ label: 'סגירה' }]); return; }
    const i = S.custom.findIndex((c) => c.id === cf.id);
    if (i >= 0) S.custom[i] = cf; else S.custom.push(cf);
    save(); show('editor');
  });

  // ---------- אתחול ----------
  async function init() {
    $('#sprite').innerHTML = illustrationSprite();
    buildPad();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (S.pinHash) await unlockFlow();
    if (!S.setupDone) startSetup(0); else show('home');
  }
  init();
})();
