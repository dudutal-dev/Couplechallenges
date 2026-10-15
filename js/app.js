/* קטיפה – לוגיקת האפליקציה. הכול נשמר ב-localStorage במכשיר בלבד. */
(() => {
  'use strict';
  const KEY = 'ktifa.v1';
  const APP_VERSION = '2026.10.15.38';
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
    media: {}, avatars: { a: false, b: false },
    tts: { mode: 'off', key: '', voiceId: '', model: 'eleven_v3' },
    ai: { key: '', model: 'claude-opus-5-5', effort: 'medium' },
    showSafety: false, eveningAlt: false, vidPref: 'personal',
    promptStyle: '', promptVideo: '', promptAct: '', promptKeep: '', promptImg: '', en: {},
    customIllus: {},
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
    // פותר מהפנימי לחיצוני, כך שאפשר לקנן: {d:גמור {s:לו|לה} בפה|תני ל{S} לגמור}
    let out = esc(text), prev;
    do {
      prev = out;
      out = out.replace(/\{(D|S|[ds]):?([^{}]*)\}/g, (m, k, rest) => {
        if (k === 'D') return `<b>${c.D}</b>`;
        if (k === 'S') return `<b>${c.S}</b>`;
        const [m1, f1 = ''] = rest.split('|');
        const g = k === 'd' ? c.dg : c.sg;
        return g === 'm' ? m1 : f1;
      });
    } while (out !== prev);
    return out;
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
  const SCREENS = ['lock', 'setup', 'home', 'play', 'dice', 'timer', 'more', 'editor', 'cardform', 'limits', 'safety', 'tts', 'ai', 'tv', 'list', 'about'];
  const TABS = { home: 'home', random: 'play', dice: 'dice', timer: 'timer', more: 'more' };
  let current = 'home';
  function show(name) {
    current = name;
    SCREENS.forEach((s) => { $('#scr-' + s).hidden = s !== name; });
    const tabbarOn = !['lock', 'setup'].includes(name) && !(name === 'about' && !S.setupDone);
    $('#tabbar').hidden = !tabbarOn;
    $$('#tabbar button').forEach((b) => b.classList.toggle('active', TABS[b.dataset.tab] === name && !(name === 'play' && b.dataset.tab === 'random' && playMode === 'session')));
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'more') renderMore();
    if (name === 'editor') renderEditor();
    if (name === 'limits') renderLimitsScreen();
    if (name === 'dice') renderDice(false);
    if (name === 'tts') renderTts();
    if (name === 'ai') renderAi();
    if (name === 'list') renderCopyList();
    if (name === 'about') { const b = $('#about-back'); b.dataset.go = S.setupDone ? 'more' : 'setup'; b.textContent = S.setupDone ? '‹ עוד' : '‹ חזרה'; window.scrollTo(0, 0); }
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
    if (g === 'tv') return enterTv();
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
      { label: 'כן, מחק הכול', cls: 'danger', onClick: () => { localStorage.removeItem(KEY); S = DEFAULT(); Media.clearAll().finally(() => location.reload()); } },
      { label: 'ביטול' },
    ]);
  }
  $('#btn-wipe').addEventListener('click', confirmWipe);

  // ---------- הגדרה ראשונית ----------
  let setupStep = 0, setupOnlyPartners = false, limitsFor = null, draft = null;
  const STEPS = ['פתיחה', 'מי אתם', 'גבולות', 'גבולות', 'סיכום'];
  function startSetup(step = 0, onlyPartners = false) {
    setupOnlyPartners = onlyPartners; draft = JSON.parse(JSON.stringify({ partners: S.partners, dom: S.dom, roleMode: S.roleMode, safeword: S.safeword }));
    setupStep = step; show('setup'); renderSetup();
  }
  function renderSetup() {
    $('#setup-steps').innerHTML = setupOnlyPartners ? '' : STEPS.map((s, i) => `<span class="${i === setupStep ? 'on' : i < setupStep ? 'done' : ''}">${s}</span>`).join('');
    const body = $('#setup-body');
    if (setupStep === 0) {
      body.innerHTML = `
        <div class="hero">
          <div class="home-emblem"><svg class="il"><use href="#il-ring"/></svg></div>
          <h1 class="brand center">קטיפה</h1>
          <p class="tagline">שליטה. אמון. אש.</p>
          <p class="lead center">ערב זוגי של משחק כוח: חפיסת משימות שמתחממת לאט, קוביות, טיימר, ומילת עצירה אחת שעוצרת הכול.</p>
          <div class="pillars">
            <div class="pillar">${illus('collar')}<b>הובלה</b><small>קבוע, מתחלף או הגרלה</small></div>
            <div class="pillar">${illus('chain')}<b>גבולות</b><small>כל אחד מסמן לבד</small></div>
            <div class="pillar">${illus('stop')}<b>מילת עצירה</b><small>עוצרת הכול, מיד</small></div>
          </div>
          <button class="btn primary big" id="su-next">מתחילים</button>
          <button class="btn ghost" id="su-about">מה זה בעצם BDSM? הסבר מעמיק</button>
          <p class="muted tiny center">הכול נשמר רק בטלפון הזה. אין חשבון, אין שרת, אין איסוף נתונים.</p>
        </div>`;
      $('#su-next').addEventListener('click', () => { setupStep = 1; renderSetup(); });
      $('#su-about').addEventListener('click', () => show('about'));
    } else if (setupStep === 1) {
      const p = draft.partners;
      body.innerHTML = `
        <h1>מי אתם</h1>
        <div class="form">
          <fieldset><legend>בן/בת זוג א׳</legend>
            <div class="avatar-pick">${avatarHtml('a', 'lg')}<button type="button" class="btn ghost small" data-av="a">תמונת פרופיל</button></div>
            <input id="pa-name" placeholder="שם" value="${esc(p.a.name)}">
            <div class="seg" id="pa-g"><button type="button" data-v="m">זכר</button><button type="button" data-v="f">נקבה</button></div>
          </fieldset>
          <fieldset><legend>בן/בת זוג ב׳</legend>
            <div class="avatar-pick">${avatarHtml('b', 'lg')}<button type="button" class="btn ghost small" data-av="b">תמונת פרופיל</button></div>
            <input id="pb-name" placeholder="שם" value="${esc(p.b.name)}">
            <div class="seg" id="pb-g"><button type="button" data-v="m">זכר</button><button type="button" data-v="f">נקבה</button></div>
          </fieldset>
          <fieldset><legend>מי מוביל</legend>
            <div class="seg" id="su-dom"><button type="button" data-v="a">א׳</button><button type="button" data-v="b">ב׳</button></div>
            <div class="seg" id="su-mode"><button type="button" data-v="fixed">קבוע כל הערב</button><button type="button" data-v="alternate">מתחלף כל משימה</button><button type="button" data-v="random">הגרלה בכל ערב</button></div>
            <p class="muted tiny" id="su-mode-help"></p>
          </fieldset>
          <fieldset><legend>מילת העצירה</legend>
            <input id="su-safe" value="${esc(draft.safeword)}" placeholder="אדום">
            <p class="muted tiny">מילה שלא תגידו במקרה. ״אדום״ = הכול עוצר. ״צהוב״ = להאט ולבדוק.</p>
          </fieldset>
        </div>
        <button class="btn primary big" id="su-next">${setupOnlyPartners ? 'שמירה' : 'הלאה: הגבולות של כל אחד'}</button>`;
      seg($('#pa-g'), p.a.g, (v) => { p.a.g = v; }); seg($('#pb-g'), p.b.g, (v) => { p.b.g = v; }); seg($('#su-dom'), draft.dom, (v) => { draft.dom = v; });
      const modeHelp = { fixed: 'מי שנבחר מוביל את כל הערב. אפשר להחליף ידנית בדף הבית.', alternate: 'משימה אחת מוביל/ה א׳, הבאה ב׳, וחוזר חלילה. מי שנבחר למעלה מתחיל. הערב עדיין מתחמם לאט מעוצמה 1 ל-3.', random: 'בכל ערב חדש האפליקציה מגרילה גם מי מוביל וגם אם ההובלה קבועה או מתחלפת כל משימה.' };
      const setHelp = (v) => { $('#su-mode-help').textContent = modeHelp[v]; };
      seg($('#su-mode'), draft.roleMode || 'fixed', (v) => { draft.roleMode = v; setHelp(v); }); setHelp(draft.roleMode || 'fixed');
      hydrateAvatars(body);
      $$('[data-av]', body).forEach((b) => b.addEventListener('click', async () => {
        const k = b.dataset.av;
        if (S.avatars[k]) { const act = await choose('תמונת פרופיל', [['change', 'החלפה'], ['remove', 'הסרה']]); if (act === 'remove') { await Media.removeFile('avatar_' + k); S.avatars[k] = false; save(); hydrateAvatars(body); return; } if (act !== 'change') return; }
        const f = await pickFile('image/*'); if (!f) return;
        await Media.saveAvatar('avatar_' + k, f); S.avatars[k] = true; save(); hydrateAvatars(body);
      }));
      $('#su-next').addEventListener('click', () => {
        p.a.name = $('#pa-name').value.trim(); p.b.name = $('#pb-name').value.trim();
        draft.safeword = $('#su-safe').value.trim() || 'אדום';
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
    return CATEGORIES.map((c, i) => {
      const s = catStatus(c.id), on = catAllowed(c.id);
      const label = s === 'yes' ? 'במשחק' : s === 'no' ? 'מחוץ למשחק' : on ? 'במשחק (״אולי״)' : 'רק אם מסמנים ״אולי״';
      const head = c.offByDefault && !(CATEGORIES[i - 1] || {}).offByDefault ? '<div class="adv-divider">מתקדם</div>' : '';
      return `${head}<div class="allowed-row ${on ? 'on' : 'off'}">${illus(c.img)}<span>${c.name}</span><em>${label}</em></div>`;
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
        <div class="limits">${CATEGORIES.map((c, i) => `
          ${c.offByDefault && !(CATEGORIES[i - 1] || {}).offByDefault ? '<h2 class="adv-head">מתקדם</h2>' : ''}
          <div class="limit-row ${c.offByDefault ? 'adv' : ''}" data-cat="${c.id}">
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
    const modeTxt = { fixed: '', alternate: ' · מתחלף כל משימה', random: ' · הגרלה בכל ערב' }[S.roleMode] || '';
    $('#home-sub').textContent = `מילת העצירה: ${S.safeword}${modeTxt}`;
    $('#home-roles').innerHTML = `<div class="role dom">${S.avatars[S.dom] ? avatarHtml(S.dom, 'lg') : illus('key')}<small>${c.dg === 'm' ? 'מוביל' : 'מובילה'}</small><b>${c.D}</b></div>
      <div class="role sub">${S.avatars[sub()] ? avatarHtml(sub(), 'lg') : illus('collar')}<small>${c.sg === 'm' ? 'מובל' : 'מובלת'}</small><b>${c.S}</b></div>`;
    hydrateAvatars($('#home-roles'));
    $('#home-mode').innerHTML = `<div class="seg" id="home-mode-seg"><button type="button" data-v="fixed">קבוע כל הערב</button><button type="button" data-v="alternate">מתחלף כל משימה</button><button type="button" data-v="random">הגרלה בכל ערב</button></div>
      <p class="muted tiny center" id="home-mode-help"></p>`;
    const help = { fixed: `${c.D} ${c.dg === 'm' ? 'מוביל' : 'מובילה'} את כל הערב. ״החלפת תפקידים״ מחליף ידנית.`, alternate: `משימה אחת ${c.D} ${c.dg === 'm' ? 'מוביל' : 'מובילה'}, הבאה ${c.S}, וחוזר חלילה. גם בקלף אקראי ובקוביות.`, random: 'בכל ערב חדש האפליקציה מגרילה גם מי מוביל וגם אם זה קבוע או מתחלף כל משימה.' + (S.session ? ` הערב: ${c.D} ${c.dg === 'm' ? 'מוביל' : 'מובילה'}, ${S.eveningAlt ? 'מתחלף' : 'קבוע'}.` : '') };
    $('#home-mode-help').textContent = help[S.roleMode] || help.fixed;
    seg($('#home-mode-seg'), S.roleMode || 'fixed', (v) => { S.roleMode = v; save(); renderHome(); });
    const ses = S.session;
    $('#btn-resume').hidden = !(ses && ses.idx < ses.cards.length);
    if (ses) $('#btn-resume').textContent = `המשך ערב (${Math.min(ses.idx + 1, ses.cards.length)}/${ses.cards.length})`;
    const n = pool().length;
    $('#home-allowed').innerHTML = `<div class="chips">${CATEGORIES.filter((k) => catAllowed(k.id)).map((k) => `<span class="chip">${k.name}</span>`).join('') || '<span class="chip off">אין קטגוריות מותרות</span>'}</div>
      <p class="muted tiny">${n} משימות זמינות · עוצמה עד ${maxLevel()}</p>`;
  }
  $('#btn-swap').addEventListener('click', () => { S.dom = sub(); save(); renderHome(); if (S.session) { /* הכרטיסים מתרנדרים מחדש בעת הצגה */ } });
  $('#btn-new').addEventListener('click', () => {
    const go = () => {
      if (S.roleMode === 'random') {
        S.dom = Math.random() < 0.5 ? 'a' : 'b'; S.eveningAlt = Math.random() < 0.5; save();
        const c = ctx();
        dialog(`<h2>ההגרלה</h2><div class="draw"><div class="draw-row">${illus('key')}<b>${c.D}</b> ${c.dg === 'm' ? 'מוביל' : 'מובילה'}${S.eveningAlt ? ' ראשון' : ' את כל הערב'}</div><div class="draw-row">${illus(S.eveningAlt ? 'cuffs' : 'lock')}<b>${S.eveningAlt ? 'מתחלף כל משימה' : 'קבוע כל הערב'}</b></div></div>`,
          [{ label: 'מתחילים', cls: 'primary', onClick: () => { buildSession(); startPlay('session'); } }]);
        return true; // הדיאלוג של ההגרלה נשאר פתוח גם כשנקרא מתוך דיאלוג האישור
      }
      buildSession(); startPlay('session');
    };
    if (S.session && S.session.idx < S.session.cards.length) dialog('<h2>ערב חדש?</h2><p>הערב הנוכחי יימחק ותיבנה חפיסה חדשה.</p>', [{ label: 'כן, ערב חדש', cls: 'primary', onClick: () => go() }, { label: 'ביטול' }]);
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
    seq.sort((x, y) => x.lvl - y.lvl); // מתחמם לאט: 1 → 2 → 3
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
  function pickRandom() {
    const p = pool();
    if (!p.length) { dialog('<h2>אין משימות</h2><p>שניכם צריכים לסמן לפחות קטגוריה אחת ״כן״, או להפעיל ״לכלול אולי״.</p>', [{ label: 'לגבולות', cls: 'primary', onClick: () => show('limits') }, { label: 'סגירה' }]); return null; }
    let c; do { c = p[Math.floor(Math.random() * p.length)]; } while (p.length > 1 && randomCard && c.id === randomCard.id);
    if (alternating() && randomCard) flipRoles();
    randomCard = c; save(); return c;
  }
  function startRandom() { if (pickRandom()) startPlay('random'); }
  const alternating = () => S.roleMode === 'alternate' || (S.roleMode === 'random' && !!S.eveningAlt);
  function flipRoles() { S.dom = sub(); }
  function sessionAdvance() { const s = S.session; if (!s) return; s.idx++; if (alternating() && s.idx < s.cards.length) flipRoles(); save(); }
  function sessionSkip(c) {
    const s = S.session; if (!s) return;
    const alt = shuffle(pool()).find((x) => x.lvl === c.lvl && !s.cards.includes(x.id));
    if (alt) s.cards[s.idx] = alt.id; else s.idx++;
    save();
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
    const who = c.to === 'B' ? null : (c.to === 'D' ? S.dom : sub());
    const av = who && S.avatars[who] ? avatarHtml(who, 'sm') : '';
    const art = mediaArtHtml(c, 'art') || `<div class="art">${illus(c.img || cat.img)}</div>`;
    return `<article class="card cat-${c.cat} ${big ? 'big' : ''}">
      <header><span class="chip to">${av}${esc(to)}</span><span class="chip cat">${cat.name}</span>${dots}</header>
      ${art}${big ? vidToggleHtml(S.media[c.id] || {}) : ''}
      <p class="text">${render(c.text)}</p>
      ${c.safe && S.showSafety ? `<p class="safe">⚠ ${esc(c.safe)}</p>` : ''}
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
    $('#play-lead').innerHTML = `${illus('key')} <b>${roleName('D')}</b> ${S.partners[S.dom].g === 'm' ? 'מוביל' : 'מובילה'}${alternating() ? ` <small>· הבא: ${roleName('S')}</small>` : ''}`;
    if (!c) { S.session = null; save(); return show('home'); }
    host.innerHTML = cardHtml(c); hydrateCard(host);
    $$('[data-vp]', host).forEach((b) => b.addEventListener('click', () => { S.vidPref = b.dataset.vp; save(); renderPlay(); }));
    const fav = S.favorites.includes(c.id);
    const tools = `<div class="row gap tools">${S.tts.mode !== 'off' ? '<button class="btn ghost small" id="pa-speak">🔊 הקראה</button>' : ''}<button class="btn ghost small" id="pa-tv">📺 טלוויזיה</button></div>`;
    acts.innerHTML = playMode === 'session'
      ? `<button class="btn primary big" id="pa-done">בוצע, הבא</button>
         <div class="row gap">
           <button class="btn ghost" id="pa-skip">דילוג</button>
           <button class="btn ghost ${fav ? 'on' : ''}" id="pa-fav">${fav ? '★ מועדף' : '☆ מועדף'}</button>
           <button class="btn ghost" id="pa-hide">לא שוב</button>
         </div>${tools}`
      : `<button class="btn primary big" id="pa-another">קלף אחר</button>
         <div class="row gap">
           <button class="btn ghost ${fav ? 'on' : ''}" id="pa-fav">${fav ? '★ מועדף' : '☆ מועדף'}</button>
           <button class="btn ghost" id="pa-hide">לא שוב</button>
         </div>${tools}`;
    $('#pa-tv').addEventListener('click', enterTv);
    $('#pa-speak') && $('#pa-speak').addEventListener('click', () => speak(plainText(c)));
    const next = () => { sessionAdvance(); renderPlay(); };
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
  $('#stop-end').addEventListener('click', () => { $('#stop-overlay').hidden = true; S.session = null; save(); if (tvOn) exitTv(); show('home'); });

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
      if (++n >= 8) { clearInterval(iv); rolling = false; if (alternating()) { flipRoles(); save(); } renderDice(false); navigator.vibrate && navigator.vibrate(30); }
    }, 90);
  });
  $('#dice-timer').addEventListener('click', () => { if (diceResult && diceResult.time.sec) { timerSet(diceResult.time.sec); show('timer'); timerStart(); } });

  // ---------- טיימר ----------
  let tTotal = 60, tLeft = 60, tEnd = null, tIv = null;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const ARC = 2 * Math.PI * 46;
  function timerDraw() { const tt = $('#tv-timer'); if (tt) { tt.textContent = (tIv || tLeft < tTotal) ? fmt(tLeft) : ''; tt.classList.toggle('run', !!tIv); } $('#timer-face').textContent = fmt(tLeft); $('#timer-arc').style.strokeDashoffset = ARC * (1 - (tTotal ? tLeft / tTotal : 0)); $('#timer-start').textContent = tIv ? 'השהיה' : (tLeft < tTotal && tLeft > 0 ? 'המשך' : 'התחל'); }
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
    $('#opt-awake').checked = S.keepAwake; $('#opt-maybe').checked = S.includeMaybe; $('#opt-safety').checked = !!S.showSafety;
    $('#pin-label').textContent = S.pinHash ? 'קוד נעילה: פעיל' : 'קוד נעילה: כבוי';
    $('#tts-label').textContent = 'הקראת כרטיסים: ' + (S.tts.mode === 'off' ? 'כבויה' : S.tts.mode === 'browser' ? 'קול הדפדפן' : 'ElevenLabs');
    Media.usage().then((u) => { $('#media-usage').textContent = `תמונות וסרטונים שלכם: ${u.count} קבצים, ${Media.fmtBytes(u.bytes)}`; });
  }
  $('#btn-media-usage').addEventListener('click', () => dialog('<h2>תמונות וסרטונים</h2><p>הקבצים נשמרים רק במכשיר הזה (IndexedDB). מחיקת האפליקציה או ניקוי נתוני האתר מוחקים אותם. ״גיבוי מלא לקובץ״ שומר את כולם לקובץ אחד.</p>', [
    { label: 'מחיקת כל התמונות והסרטונים', cls: 'danger', onClick: () => { Media.clearAll().then(() => { S.media = {}; S.avatars = { a: false, b: false }; save(); renderMore(); }); } },
    { label: 'סגירה' }]));

  // ---------- גיבוי ושחזור ----------
  const APP_ID = 'ktifa';
  function backupMediaMap() {
    const map = {};
    Object.entries(S.media || {}).forEach(([cardId, m]) => Object.keys(m || {}).forEach((slot) => { map[mediaKey(cardId, slot)] = { cardId, slot }; }));
    ['a', 'b'].forEach((k) => { map['avatar_' + k] = { avatar: k }; });
    return map;
  }
  $('#btn-backup').addEventListener('click', async () => {
    dialog('<h2>מכין גיבוי…</h2><p class="muted" id="bk-prog">אוסף קבצים</p><p class="muted tiny">זה יכול לקחת כמה דקות אם יש הרבה סרטונים. אל תסגרו את האפליקציה.</p>', []);
    const prog = (t) => { const el = $('#bk-prog'); if (el) el.textContent = t; };
    try {
      const res = await Backup.exportAll({ app: APP_ID, version: APP_VERSION, state: JSON.parse(localStorage.getItem(KEY) || '{}'), mediaMap: backupMediaMap(), progress: prog });
      if (res.parts.length === 1) Backup.download(res.parts[0].blob, res.parts[0].name);
      const btns = res.parts.map((p, i) => ({ label: res.parts.length > 1 ? `הורדת חלק ${i + 1} מתוך ${res.parts.length} (${Media.fmtBytes(p.blob.size)})` : `הורדה שוב (${Media.fmtBytes(p.blob.size)})`, cls: 'primary', onClick: () => { Backup.download(p.blob, p.name); return true; } }));
      dialog(`<h2>הגיבוי מוכן</h2><p>${res.count} קבצים, ${Media.fmtBytes(res.bytes)}${res.parts.length > 1 ? `, ב-${res.parts.length} חלקים. הורידו את כולם.` : '.'} הקובץ כולל גם את כל ההגדרות, הגבולות והמשימות שהוספתם.</p><p class="muted tiny">שמרו את הקובץ בענן או במחשב. לשחזור במכשיר אחר: ״עוד ← שחזור מקובץ גיבוי״ ובחירת הקובץ (בגיבוי מחולק: כל חלק בנפרד).</p>`, btns.concat([{ label: 'סגירה' }]));
    } catch (e) { dialog(`<h2>הגיבוי נכשל</h2><p class="muted">${esc(e.message || String(e))}</p>`, [{ label: 'סגירה' }]); }
  });
  let restoreMode = 'all';
  $('#btn-restore').addEventListener('click', () => dialog('<h2>שחזור מגיבוי</h2><p>בחרו קובץ גיבוי (.zip) שנוצר באפליקציה. התמונות והסרטונים יתווספו למכשיר הזה.</p><p class="muted tiny">״הכול״ מחזיר גם הגדרות, שמות, גבולות ומשימות שהוספתם, ומחליף את מה שיש עכשיו. ״רק מדיה״ משאיר את ההגדרות הנוכחיות.</p>', [
    { label: 'שחזור הכול', cls: 'primary', onClick: () => { restoreMode = 'all'; $('#restore-file').click(); } },
    { label: 'רק תמונות וסרטונים', onClick: () => { restoreMode = 'media'; $('#restore-file').click(); } },
    { label: 'ביטול' }]));
  $('#restore-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    dialog('<h2>משחזר…</h2><p class="muted" id="bk-prog">קורא את הקובץ</p>', []);
    const prog = (t) => { const el = $('#bk-prog'); if (el) el.textContent = t; };
    try {
      const r = await Backup.importFile(f, prog);
      if (r.manifest.app && r.manifest.app !== APP_ID) throw new Error(`זה גיבוי של אפליקציה אחרת (${r.manifest.app})`);
      if (restoreMode === 'all' && r.manifest.state) localStorage.setItem(KEY, JSON.stringify(r.manifest.state));
      else {
        const st = r.manifest.state || {};
        for (const m of r.manifest.files || []) {
          if (m.cardId && m.slot) { S.media[m.cardId] = Object.assign({}, S.media[m.cardId] || {}, { [m.slot]: (st.media && st.media[m.cardId] && st.media[m.cardId][m.slot]) || { size: m.size } }); }
          if (m.avatar) S.avatars[m.avatar] = true;
        }
        save();
      }
      dialog(`<h2>השחזור הושלם</h2><p>${r.count} קבצים שוחזרו${r.manifest.parts > 1 ? ` (חלק ${r.manifest.part} מתוך ${r.manifest.parts}; שחזרו גם את שאר החלקים)` : ''}.</p>`, [{ label: 'טעינה מחדש', cls: 'primary', onClick: () => location.reload() }]);
    } catch (err) { dialog(`<h2>השחזור נכשל</h2><p class="muted">${esc(err.message || String(err))}</p>`, [{ label: 'סגירה' }]); }
  });
  $('#opt-awake').addEventListener('change', (e) => { S.keepAwake = e.target.checked; save(); });
  $('#opt-maybe').addEventListener('change', (e) => { S.includeMaybe = e.target.checked; save(); });
  $('#opt-safety').addEventListener('change', (e) => { S.showSafety = e.target.checked; save(); });

  // ---------- עורך חפיסה ----------
  let edFilter = 'all';
  const edOpen = {};
  const leadLabel = (who) => { const p = S.partners[who]; return `${p.name || (who === 'a' ? 'א׳' : 'ב׳')} ${p.g === 'm' ? 'מוביל' : 'מובילה'}`; };
  function renderEditor() {
    const f = $('#editor-filters');
    f.innerHTML = [['all', 'הכול'], ['media', '🖼 עם מדיה'], ['fav', '★ מועדפים'], ['hidden', 'מוסתרים'], ['custom', 'שלנו']].map(([k, l]) => `<button class="chip ${edFilter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('');
    $$('button', f).forEach((b) => b.addEventListener('click', () => { edFilter = b.dataset.f; renderEditor(); }));
    let list = allCards();
    if (edFilter === 'fav') list = list.filter((c) => S.favorites.includes(c.id));
    else if (edFilter === 'hidden') list = list.filter((c) => S.hidden.includes(c.id));
    else if (edFilter === 'custom') list = list.filter((c) => c.id.startsWith('u_'));
    else if (edFilter === 'media') list = list.filter((c) => hasMedia(c.id));
    const groups = CATEGORIES.concat([{ id: AFTERCARE_ID, name: 'אחרי', img: 'blanket' }]).map((cat) => ({ cat, cards: list.filter((c) => c.cat === cat.id) })).filter((g) => g.cards.length);
    const row = (c, cat) => {
      const hid = S.hidden.includes(c.id), fav = S.favorites.includes(c.id), m = S.media[c.id] || {};
      return `<div class="ed-row ${hid ? 'hid' : ''}" data-id="${c.id}">
        <div class="ed-art">${illus(c.img || cat.img)}</div>
        <div class="ed-main"><small>עוצמה ${c.lvl || 'אחרי'} · ${c.to === 'B' ? 'שניכם' : c.to === 'D' ? 'מוביל/ה' : 'מובל/ת'}${c.id.startsWith('u_') ? ' · שלנו' : ''}</small><p>${render(c.text)}</p>
          <div class="ed-media"><small class="muted">${hasMedia(c.id) ? '🖼🎬 יש מדיה · ' : ''}העלאת תמונות וסרטונים: ב״להעתקה ופרומפטים״</small></div></div>
        <div class="ed-btns">
          <button class="icon ${fav ? 'on' : ''}" data-act="fav" title="מועדף">${fav ? '★' : '☆'}</button>
          <button class="icon" data-act="hide" title="${hid ? 'החזרה' : 'הסתרה'}">${hid ? '↩' : '🚫'}</button>
          ${c.id.startsWith('u_') ? `<button class="icon" data-act="edit" title="עריכה">✎</button><button class="icon" data-act="del" title="מחיקה">🗑</button>` : ''}
        </div></div>`;
    };
    $('#editor-list').innerHTML = groups.map(({ cat, cards }) => {
      const nMedia = cards.filter((c) => hasMedia(c.id)).length, open = edOpen[cat.id] !== false && (edFilter !== 'all' || edOpen[cat.id] === true);
      return `<section class="ed-group ${open ? 'open' : ''}" data-cat="${cat.id}">
        <button class="ed-head" data-toggle="${cat.id}">${illus(cat.img)}<span class="ed-name">${cat.name}</span><small>${cards.length} משימות${nMedia ? ` · ${nMedia} עם מדיה` : ''}</small><i class="chev"></i></button>
        <div class="ed-body" ${open ? '' : 'hidden'}>${cards.map((c) => row(c, cat)).join('')}</div>
      </section>`;
    }).join('') || '<p class="muted center">אין כרטיסים בסינון הזה.</p>';
    $$('[data-toggle]', $('#editor-list')).forEach((b) => b.addEventListener('click', () => { const id = b.dataset.toggle; edOpen[id] = !(edOpen[id] === true || (edFilter !== 'all' && edOpen[id] !== false)); renderEditor(); }));
    $$('.ed-row', $('#editor-list')).forEach((r) => $$('button', r).forEach((b) => b.addEventListener('click', () => {
      const id = r.dataset.id, act = b.dataset.act;
      if (act === 'fav') toggleIn(S.favorites, id);
      if (act === 'hide') toggleIn(S.hidden, id);
      if (act === 'edit') return openCardForm(cardById(id));
      if (act === 'img' || ALL_VID_SLOTS.includes(act)) return mediaSlotDialog(id, act, renderEditor);
      if (act === 'del') return dialog('<h2>למחוק את הכרטיס?</h2>', [{ label: 'מחיקה', cls: 'danger', onClick: () => { S.custom = S.custom.filter((c) => c.id !== id); ['img'].concat(ALL_VID_SLOTS).forEach((k) => Media.removeFile(mediaKey(id, k))); delete S.media[id]; save(); renderEditor(); } }, { label: 'ביטול' }]);
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
    const ip = $('#cf-img');
    const renderPick = () => {
      ip.innerHTML = Object.keys(CUSTOM_ILLUS).map((k) => `<button type="button" class="ai ${k === cf.img ? 'on' : ''}" data-v="${k}">${illus(k)}</button>`).join('')
        + Object.keys(ILLUSTRATIONS).map((k) => `<button type="button" class="${k === cf.img ? 'on' : ''}" data-v="${k}">${illus(k)}</button>`).join('');
      $$('button', ip).forEach((b) => b.addEventListener('click', () => { cf.img = b.dataset.v; $$('button', ip).forEach((x) => x.classList.toggle('on', x === b)); preview(); }));
    };
    renderPick();
    $('#cf-ai').onclick = () => aiIllustrationDialog(cf, (id) => { cf.img = id; renderPick(); preview(); });
    $('#cf-text').value = cf.text; $('#cf-text').oninput = (e) => { cf.text = e.target.value; preview(); };
    const preview = () => { $('#cf-preview').innerHTML = cf.text.trim() ? cardHtml(cf, false) : '<p class="muted center">הטקסט יופיע כאן כפי שייראה במשחק.</p>'; hydrateCard($('#cf-preview')); };
    preview(); show('cardform');
  }
  $('#cardform-save').addEventListener('click', () => {
    if (!cf.text.trim()) { dialog('<h2>חסר טקסט</h2>', [{ label: 'סגירה' }]); return; }
    const i = S.custom.findIndex((c) => c.id === cf.id);
    if (i >= 0) S.custom[i] = cf; else S.custom.push(cf);
    save(); show('editor');
  });

  // ---------- קבצים, תמונות וסרטונים ----------
  function pickFile(accept) {
    return new Promise((res) => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
      inp.addEventListener('change', () => { res(inp.files[0] || null); inp.remove(); });
      document.body.appendChild(inp); inp.click();
    });
  }
  function choose(title, opts) {
    return new Promise((res) => dialog(`<h2>${esc(title)}</h2>`, opts.map(([v, l]) => ({ label: l, cls: v === 'remove' ? 'danger' : 'ghost', onClick: () => res(v) })).concat([{ label: 'ביטול', onClick: () => res(null) }])));
  }
  // מדיה לכל כרטיס: חריץ תמונה (img) וחריץ סרטון (vid). שניהם מוצגים אם שניהם קיימים.
  const mediaKey = (cardId, slot) => `${cardId}:${slot}`;
  // סרטונים: שני סוגים (אישי = vidA/vidB, הדגמה = demoA/demoB), לכל סוג סרטון לפי מי מוביל (A או B).
  // מציגים את הסוג המועדף אם קיים, ובתוכו את הסרטון של מי שמוביל, ואם אין – את של השני.
  const VID_TYPES = { personal: ['vidA', 'vidB'], demo: ['demoA', 'demoB'] };
  const ALL_VID_SLOTS = ['vidA', 'vidB', 'demoA', 'demoB'];
  const hasMedia = (cardId) => { const m = S.media[cardId]; return !!(m && (m.img || ALL_VID_SLOTS.some((k) => m[k]))); };
  const vidSlotFor = (who, type = 'personal') => VID_TYPES[type][who === 'a' ? 0 : 1];
  const slotType = (slot) => (slot.startsWith('demo') ? 'demo' : 'personal');
  const slotWho = (slot) => (slot.endsWith('A') ? 'a' : 'b');
  const typeAvailable = (m, type) => VID_TYPES[type].some((k) => m[k]);
  function activeVidType(m) { const pref = S.vidPref || 'personal', other = pref === 'personal' ? 'demo' : 'personal'; return typeAvailable(m, pref) ? pref : (typeAvailable(m, other) ? other : null); }
  function activeVidSlot(m) {
    const type = activeVidType(m); if (!type) return null;
    const pref = vidSlotFor(S.dom, type), other = VID_TYPES[type].find((k) => k !== pref);
    return m[pref] ? pref : (m[other] ? other : null);
  }
  function vidToggleHtml(m, cls = 'vid-toggle') {
    if (!(typeAvailable(m, 'personal') && typeAvailable(m, 'demo'))) return '';
    const t = activeVidType(m);
    return `<div class="seg ${cls}"><button type="button" data-vp="personal" class="${t === 'personal' ? 'on' : ''}">סרטון אישי</button><button type="button" data-vp="demo" class="${t === 'demo' ? 'on' : ''}">הדגמה</button></div>`;
  }
  function mediaArtHtml(c, cls = 'art') {
    const m = S.media[c.id] || {};
    const v = activeVidSlot(m);
    const slots = ['img'].filter((k) => m[k]).concat(v ? [v] : []);
    if (!slots.length) return null;
    return `<div class="${cls} media ${slots.length === 2 ? 'both' : ''}">${slots.map((k) => `<div class="m-${k}" data-media="${mediaKey(c.id, k)}"></div>`).join('')}</div>`;
  }
  let liveUrls = [];
  function freeUrls() { liveUrls.forEach((u) => URL.revokeObjectURL(u)); liveUrls = []; }
  function avatarHtml(k, size) { return `<span class="avatar ${size}" data-avatar="${k}">${illus(k === S.dom ? 'key' : 'collar')}</span>`; }
  async function hydrateAvatars(root) {
    for (const el of $$('[data-avatar]', root)) {
      const k = el.dataset.avatar, rec = S.avatars[k] ? await Media.getFile('avatar_' + k) : null;
      if (rec && rec.blob) { const u = URL.createObjectURL(rec.blob); liveUrls.push(u); el.style.backgroundImage = `url(${u})`; el.classList.add('has'); }
      else { el.style.backgroundImage = ''; el.classList.remove('has'); }
    }
  }
  async function hydrateCard(root) {
    hydrateAvatars(root);
    for (const el of $$('[data-media]', root)) {
      const rec = await Media.getFile(el.dataset.media);
      if (!rec || !rec.blob) { el.innerHTML = illus('camera'); continue; }
      const u = URL.createObjectURL(rec.blob); liveUrls.push(u);
      if (rec.kind === 'video') {
        el.innerHTML = `<video src="${u}" playsinline controls loop muted autoplay preload="metadata"></video><button type="button" class="vid-expand" title="הגדלה">⛶</button>`;
        $('.vid-expand', el).addEventListener('click', (ev) => { ev.stopPropagation(); videoFullscreen($('video', el), u); });
      } else { el.innerHTML = `<img src="${u}" alt="">`; $('img', el).addEventListener('click', () => { const lb = $('#lightbox'); lb.innerHTML = `<img src="${u}" alt="">`; lb.hidden = false; }); }
    }
  }
  function videoFullscreen(v, url) {
    if (tvOn) { tvVideoFull = true; renderTv(); return; }
    try {
      if (v.webkitEnterFullscreen) { v.webkitEnterFullscreen(); return; } // אייפון: נגן מסך מלא מקורי
      if (v.requestFullscreen) { v.requestFullscreen().then(() => v.play().catch(() => {})).catch(() => lightboxVideo(url)); return; }
    } catch { /* נופלים ל-lightbox */ }
    lightboxVideo(url);
  }
  function lightboxVideo(url) {
    const lb = $('#lightbox'); lb.innerHTML = `<video src="${url}" playsinline controls autoplay loop></video><button class="btn stop small lb-close">סגירה</button>`;
    lb.hidden = false; $('.lb-close', lb).addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  }
  function closeLightbox() { const lb = $('#lightbox'); lb.hidden = true; lb.innerHTML = '<img alt="">'; }
  $('#lightbox').addEventListener('click', (e) => { if (e.target.tagName === 'VIDEO' || e.target.classList.contains('lb-close')) return; closeLightbox(); });
  async function mediaSlotDialog(cardId, slot, onChange) {
    const key = mediaKey(cardId, slot), isVid = slot !== 'img';
    const who = isVid ? slotWho(slot) : 'a', leadName = isVid ? `${S.partners[who].name || (who === 'a' ? 'א׳' : 'ב׳')} ${S.partners[who].g === 'm' ? 'מוביל' : 'מובילה'}` : '';
    const typeName = isVid ? (slotType(slot) === 'demo' ? 'הדגמה' : 'סרטון אישי') : '';
    const cur = (S.media[cardId] || {})[slot];
    const rec = cur ? await Media.getFile(key) : null;
    let prev = '';
    if (rec && rec.blob) { const u = URL.createObjectURL(rec.blob); liveUrls.push(u); prev = isVid ? `<video class="dlg-media" src="${u}" playsinline controls muted></video>` : `<img class="dlg-media" src="${u}" alt="">`; }
    const doPick = async () => {
      const f = await pickFile(isVid ? 'video/*' : 'image/*'); if (!f) return;
      if (f.size > 200e6) { dialog('<h2>קובץ גדול מדי</h2><p>עד 200MB לסרטון. קצרו אותו או בחרו אחר.</p>', [{ label: 'סגירה' }]); return; }
      dialog('<h2>שומר...</h2><p class="muted">תמונות מוקטנות אוטומטית. סרטונים נשמרים כמו שהם.</p>', []);
      try {
        const info = await Media.saveFile(key, f);
        S.media[cardId] = Object.assign({}, S.media[cardId] || {}, { [slot]: { size: info.size } }); save();
        $('#dlg').hidden = true; onChange && onChange();
      } catch (e) { dialog('<h2>לא נשמר</h2><p>אולי אין מספיק מקום במכשיר. נסו קובץ קטן יותר.</p>', [{ label: 'סגירה' }]); }
    };
    const card = cardById(cardId);
    dialog(`<h2>${isVid ? '🎬 ' + typeName + ' כש' + esc(leadName) : '🖼 תמונה'}</h2><p class="muted tiny">${card ? plainText(card).slice(0, 90) : ''}…</p>${prev}
      <p class="muted tiny">${isVid ? 'עדיף עד דקה, בפורמט שהטלפון מצלם. מתנגן אוטומטית בלי קול, אפשר להדליק.' : 'מוקטנת אוטומטית ל-1600 פיקסל.'} ${isVid ? ' מוצג כשזה מי שמוביל/ה; אם אין סרטון לצד השני, מוצג הזה.' : ''} אם יש גם תמונה וגם סרטון, שניהם יופיעו בכרטיס. נשמר רק במכשיר הזה.</p>`, [
      { label: cur ? (isVid ? 'החלפת הסרטון' : 'החלפת התמונה') : (isVid ? 'בחירת סרטון' : 'בחירת תמונה'), cls: 'primary', onClick: () => { doPick(); return true; } },
      ...(cur ? [{ label: 'הסרה', cls: 'danger', onClick: () => { Media.removeFile(key).then(() => { const m = S.media[cardId] || {}; delete m[slot]; if (!m.img && !ALL_VID_SLOTS.some((k) => m[k])) delete S.media[cardId]; else S.media[cardId] = m; save(); onChange && onChange(); }); } }] : []),
      { label: 'סגירה' },
    ]);
  }
  // העברה מהפורמט הישן (קובץ אחד לכרטיס) לחריצים
  async function migrateMedia() {
    for (const [id, m] of Object.entries(S.media)) {
      if (m && m.vid) { // חריץ סרטון יחיד מגרסה קודמת -> לפי מי מוביל עכשיו
        const to = vidSlotFor(S.dom), rec = await Media.getFile(mediaKey(id, 'vid'));
        if (rec && rec.blob) { try { await Media.saveFile(mediaKey(id, to), new File([rec.blob], 'm', { type: rec.type || rec.blob.type })); } catch { /* */ } }
        await Media.removeFile(mediaKey(id, 'vid')); m[to] = m.vid; delete m.vid; continue;
      }
      if (!m || !m.kind) continue;
      const rec = await Media.getFile(id);
      const slot = m.kind === 'video' ? vidSlotFor(S.dom) : 'img';
      if (rec && rec.blob) { try { await Media.saveFile(mediaKey(id, slot), new File([rec.blob], 'm', { type: rec.type || rec.blob.type })); } catch { /* */ } }
      await Media.removeFile(id);
      S.media[id] = { [slot]: { size: m.size || 0 } };
    }
    save();
  }

  // ---------- הקראה (קול הדפדפן או ElevenLabs) ----------
  function plainText(c) { const d = document.createElement('div'); d.innerHTML = render(c.text); return d.textContent; }
  let audioEl = null;
  function stopSpeech() { if (window.speechSynthesis) speechSynthesis.cancel(); if (audioEl) { audioEl.pause(); audioEl = null; } }
  function speakBrowser(text) {
    if (!window.speechSynthesis) { dialog('<h2>אין הקראה</h2><p>הדפדפן הזה לא תומך בהקראה.</p>', [{ label: 'סגירה' }]); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = 'he-IL'; u.rate = 0.92;
    const v = speechSynthesis.getVoices().find((x) => /he/i.test(x.lang)); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  async function speakEleven(text) {
    const { key, voiceId, model } = S.tts;
    if (!key || !voiceId) { dialog('<h2>חסר מפתח או קול</h2><p>הגדירו מפתח API ומזהה קול במסך ההקראה.</p>', [{ label: 'להגדרות', cls: 'primary', onClick: () => show('tts') }, { label: 'סגירה' }]); return; }
    const ck = await sha(model + '|' + voiceId + '|' + text);
    let blob = await Media.getAudio(ck);
    if (!blob) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: model, language_code: model === 'eleven_v3' ? undefined : 'he' }),
      });
      if (!r.ok) { let msg = ''; try { msg = (await r.json()).detail?.message || ''; } catch { /* */ } throw new Error(`ElevenLabs ${r.status}${msg ? ': ' + msg : ''}`); }
      blob = await r.blob(); await Media.putAudio(ck, blob);
    }
    stopSpeech(); const u = URL.createObjectURL(blob); liveUrls.push(u); audioEl = new Audio(u); audioEl.play();
  }
  async function speak(text) {
    stopSpeech();
    if (S.tts.mode === 'browser') return speakBrowser(text);
    if (S.tts.mode === 'eleven') { try { await speakEleven(text); } catch (e) { dialog(`<h2>ElevenLabs לא ענה</h2><p class="tiny">${esc(e.message)}</p><p>בודקים: מפתח תקין, מזהה קול נכון, יתרת תווים, חיבור לרשת.</p>`, [{ label: 'הקראה בקול הדפדפן', cls: 'primary', onClick: () => speakBrowser(text) }, { label: 'סגירה' }]); } }
  }
  function renderTts() {
    const t = S.tts;
    $('#tts-body').innerHTML = `
      <p class="muted">הקראה של הכרטיס בלחיצה על 🔊. קול הדפדפן עובד אופליין וחינם. ElevenLabs נותן קול הרבה יותר טוב, דורש רשת ומפתח API משלכם, והקלטות נשמרות במכשיר כדי לא לשלם פעמיים על אותו כרטיס.</p>
      <div class="seg" id="tts-mode"><button type="button" data-v="off">כבוי</button><button type="button" data-v="browser">קול הדפדפן</button><button type="button" data-v="eleven">ElevenLabs</button></div>
      <div class="form" id="tts-eleven" ${t.mode === 'eleven' ? '' : 'hidden'}>
        <label>מפתח API (xi-api-key)<input id="tts-key" type="password" value="${esc(t.key)}" placeholder="sk_..." autocomplete="off" dir="ltr"></label>
        <label>מזהה קול (Voice ID)<input id="tts-voice" value="${esc(t.voiceId)}" placeholder="למשל 21m00Tcm4TlvDq8ikWAM" dir="ltr"></label>
        <label>מודל<select id="tts-model" dir="ltr">
          <option value="eleven_v3" ${t.model === 'eleven_v3' ? 'selected' : ''}>eleven_v3 (תומך עברית, מומלץ)</option>
          <option value="eleven_multilingual_v2" ${t.model === 'eleven_multilingual_v2' ? 'selected' : ''}>eleven_multilingual_v2</option>
          <option value="eleven_flash_v2_5" ${t.model === 'eleven_flash_v2_5' ? 'selected' : ''}>eleven_flash_v2_5</option>
          <option value="eleven_turbo_v2_5" ${t.model === 'eleven_turbo_v2_5' ? 'selected' : ''}>eleven_turbo_v2_5</option>
        </select></label>
        <p class="muted tiny">המפתח נשמר רק בטלפון הזה ונשלח ישירות ל-ElevenLabs. כדאי ליצור ב-ElevenLabs מפתח נפרד עם הרשאת Text to Speech בלבד. את ה-Voice ID לוקחים מספריית הקולות (My Voices ← ⋯ ← Copy voice ID). קול שיצרתם משלכם או מהספרייה, גם קול שמדבר עברית.</p>
      </div>
      <div class="stack">
        <button class="btn primary" id="tts-test" ${t.mode === 'off' ? 'disabled' : ''}>בדיקת קול</button>
        <button class="btn ghost" id="tts-clear">מחיקת הקלטות שמורות</button>
      </div>`;
    seg($('#tts-mode'), t.mode, (v) => { t.mode = v; save(); $('#tts-eleven').hidden = v !== 'eleven'; $('#tts-test').disabled = v === 'off'; });
    $('#tts-key').oninput = (e) => { t.key = e.target.value.trim(); save(); };
    $('#tts-voice').oninput = (e) => { t.voiceId = e.target.value.trim(); save(); };
    $('#tts-model').onchange = (e) => { t.model = e.target.value; save(); };
    $('#tts-test').addEventListener('click', () => speak(`${roleName('S')}, על הברכיים. ידיים מאחורי הגב. ${roleName('D')} ${S.partners[S.dom].g === 'm' ? 'מחליט' : 'מחליטה'} מתי ממשיכים.`));
    $('#tts-clear').addEventListener('click', () => Media.clearAudio().then(() => dialog('<h2>נמחק</h2>', [{ label: 'סגירה' }])));
  }

  // ---------- איורים ב-AI (Claude) ----------
  const AI_MODELS = [['claude-opus-5-5', 'Opus 5.5 (ברירת מחדל, הכי טוב)'], ['claude-sonnet-5-5', 'Sonnet 5.5 (זול יותר)'], ['claude-haiku-5-5', 'Haiku 5.5 (הכי זול)']];
  const AI_STYLE = `You draw icons for a Hebrew couples' game app. Output ONLY the inner markup of an SVG <symbol> (no <svg>, no <symbol>, no code fences, no prose).
Canvas: viewBox 0 0 100 100, keep a 6 unit margin. Allowed elements: path, circle, ellipse, rect, line, polyline, polygon. 3 to 12 elements.
Style: art-deco erotic line art. A single elegant gold line on dark (stroke is inherited: do NOT set stroke or stroke-width; fill is inherited as none). Small accents may use fill="currentColor" (dots, a pupil). Dashed detail lines may use stroke-dasharray="3 4". No text, no gradients, no defs, no filters, no images.
Subject: sensual, confident, adult: silhouettes, curves of a back or hip, bound wrists, a collar, a heel, a bitten lip, rope, a leash, a hand on skin. Suggest, never show explicit genitals. Keep it minimal and readable at 40px.
Two examples of the house style:
EXAMPLE kneeling figure:
` + ILLUSTRATIONS.kneel + `
EXAMPLE corset:
` + ILLUSTRATIONS.corset;
  const SVG_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
  const SVG_ATTRS = new Set(['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points', 'x1', 'y1', 'x2', 'y2', 'fill', 'stroke-dasharray', 'stroke-width', 'opacity', 'transform', 'stroke-linecap', 'stroke-linejoin']);
  function sanitizeSvgBody(raw) {
    let t = String(raw || '').trim();
    const fence = t.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i); if (fence) t = fence[1];
    const sym = t.match(/<symbol[^>]*>([\s\S]*?)<\/symbol>/i); if (sym) t = sym[1];
    const svg = t.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i); if (svg) t = svg[1];
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${t}</svg>`, 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw new Error('SVG לא תקין');
    const out = [];
    for (const el of [...doc.documentElement.children]) {
      const tag = el.localName.toLowerCase(); if (!SVG_TAGS.has(tag)) continue;
      const attrs = [];
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase(), v = a.value.trim();
        if (!SVG_ATTRS.has(n) || /url\(|javascript|<|>|expression/i.test(v)) continue;
        if (n === 'fill' && v !== 'none' && v !== 'currentColor') continue;
        attrs.push(`${n}="${v.replace(/"/g, '')}"`);
      }
      out.push(`<${tag} ${attrs.join(' ')}/>`);
    }
    if (!out.length) throw new Error('לא נמצאו צורות באיור');
    if (out.length > 40) out.length = 40;
    return out.join('');
  }
  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) sdkPromise = import('https://esm.sh/@anthropic-ai/sdk@0.133.0').then((m) => m.default || m.Anthropic || m);
    return sdkPromise;
  }
  async function generateIllustration(subject) {
    const { key, model, effort } = S.ai;
    if (!key) throw new Error('חסר מפתח API של Anthropic. אפשר להגדיר ב״עוד ← איורים ב-AI״.');
    const Anthropic = await loadSdk();
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    const req = {
      model, max_tokens: 6000,
      output_config: { effort: effort || 'medium' },
      system: AI_STYLE,
      messages: [{ role: 'user', content: `Draw: ${subject}` }],
    };
    let res;
    if (model !== 'claude-haiku-5-5') {
      res = await client.beta.messages.create({ ...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    } else res = await client.messages.create(req);
    if (res.stop_reason === 'refusal') throw new Error('המודל סירב לצייר את זה. נסו ניסוח אחר, פחות מפורש.');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return sanitizeSvgBody(text);
  }
  function aiErrorMessage(e) {
    const st = e && e.status;
    if (st === 401) return 'המפתח לא תקין (401).';
    if (st === 429) return 'יותר מדי בקשות או נגמר האשראי (429). נסו שוב עוד רגע.';
    if (st === 400) return 'הבקשה נדחתה (400): ' + (e.message || '');
    if (e && /Failed to fetch|NetworkError|import/i.test(e.message)) return 'אין חיבור לרשת, או שהרשת חוסמת את api.anthropic.com / esm.sh.';
    return (e && e.message) || 'שגיאה לא ידועה';
  }
  function aiIllustrationDialog(card, onSaved) {
    const seed = card && card.text ? plainText(card).slice(0, 220) : '';
    let body = null, prompt = seed;
    const render = (state, msg) => {
      const prev = state === 'loading' ? '<div class="ai-preview loading"><span class="spinner"></span></div>'
        : body ? `<div class="ai-preview"><svg class="il" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg></div>` : '';
      dialog(`<h2>איור ב-AI</h2><p class="muted tiny">תארו מה לצייר. המודל מצייר בסגנון הקווים של האפליקציה. כל ניסיון עולה כסף בחשבון ה-API שלכם.</p>
        <textarea id="ai-prompt" rows="3" placeholder="למשל: אישה כורעת עם קולר, ידיים מאחורי הגב, בפרופיל">${esc(prompt)}</textarea>${prev}
        ${msg ? `<p class="danger tiny">${esc(msg)}</p>` : ''}`, [
        ...(body ? [{ label: 'לשמור ולהשתמש באיור', cls: 'primary', onClick: () => { const id = 'ai_' + Date.now().toString(36); S.customIllus[id] = body; save(); addCustomIllustration(id, body); onSaved && onSaved(id); } }] : []),
        ...(state !== 'loading' ? [{ label: body ? 'לצייר שוב' : '✨ לצייר', cls: body ? 'ghost' : 'primary', onClick: () => { run($('#ai-prompt').value.trim()); return true; } }] : []),
        { label: 'סגירה' },
      ]);
    };
    const run = async (p) => {
      if (!p) return;
      prompt = p; render('loading');
      try { body = await generateIllustration(p); render('ok'); }
      catch (e) { body = null; render('error', aiErrorMessage(e)); }
    };
    render('idle');
  }
  function renderAi() {
    const a = S.ai;
    $('#ai-body').innerHTML = `
      <p class="muted">איורים חדשים לכרטיסים שלכם, מצוירים על ידי Claude בסגנון הקווים של האפליקציה. דורש מפתח API של Anthropic ורשת. המפתח נשמר רק בטלפון ונשלח ישירות ל-api.anthropic.com. כל איור הוא בקשה אחת, בדרך כלל כמה אגורות עד כמה עשרות אגורות, לפי המודל.</p>
      <div class="form">
        <label>מפתח API של Anthropic<input id="ai-key" type="password" value="${esc(a.key)}" placeholder="sk-ant-..." autocomplete="off" dir="ltr"></label>
        <label>מודל<select id="ai-model" dir="ltr">${AI_MODELS.map(([v, l]) => `<option value="${v}" ${a.model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>מאמץ (איכות מול מחיר)
          <div class="seg" id="ai-effort"><button type="button" data-v="low">נמוך</button><button type="button" data-v="medium">בינוני</button><button type="button" data-v="high">גבוה</button></div>
        </label>
      </div>
      <div class="stack">
        <button class="btn primary" id="ai-test">✨ ניסיון: לצייר ״קולר עם רצועה״</button>
      </div>
      <h2>איורים שיצרתם (${Object.keys(S.customIllus).length})</h2>
      <div class="imgpick" id="ai-list">${Object.keys(S.customIllus).map((k) => `<button type="button" class="ai" data-v="${k}" title="מחיקה">${illus(k)}</button>`).join('') || '<p class="muted tiny">עדיין אין. יוצרים מתוך טופס כרטיס חדש: ״✨ איור ב-AI״.</p>'}</div>
      <p class="muted tiny">לחיצה על איור מוחקת אותו. כרטיסים שהשתמשו בו יחזרו לאיור ברירת המחדל.</p>`;
    $('#ai-key').oninput = (e) => { a.key = e.target.value.trim(); save(); };
    $('#ai-model').onchange = (e) => { a.model = e.target.value; save(); };
    seg($('#ai-effort'), a.effort || 'medium', (v) => { a.effort = v; save(); });
    $('#ai-test').addEventListener('click', () => aiIllustrationDialog({ text: 'קולר עור עם טבעת ורצועה שנמשכת הצידה' }, () => renderAi()));
    $$('#ai-list button', $('#ai-body')).forEach((b) => b.addEventListener('click', () => dialog('<h2>למחוק את האיור?</h2>', [
      { label: 'מחיקה', cls: 'danger', onClick: () => { const id = b.dataset.v; delete S.customIllus[id]; S.custom.forEach((c) => { if (c.img === id) c.img = 'heart'; }); save(); removeCustomIllustration(id); renderAi(); } },
      { label: 'ביטול' }])));
  }

  // ---------- טלוויזיה: במה 16:9 לשיקוף מסך, ושידור Presentation API ----------
  let tvOn = false, tvView = 'card', tvConn = null, tvReq = null, tvVideoFull = false;
  const TV_URL = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?tv=1';
  const isReceiver = new URLSearchParams(location.search).get('tv') === '1';
  async function enterTv() {
    tvOn = true; tvView = diceResult && current === 'dice' ? 'dice' : 'card';
    document.body.classList.add('tv-on'); show('tv'); renderTv(); requestWake();
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* iOS */ }
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* לא נתמך */ }
  }
  function exitTv() {
    tvOn = false; document.body.classList.remove('tv-on');
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch { /* */ }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* */ }
    if (tvConn) { try { tvConn.terminate(); } catch { /* */ } tvConn = null; }
    show(playMode === 'random' && randomCard ? 'play' : (S.session ? 'play' : 'home'));
  }
  function tvCardView(c) {
    const cat = c.cat === AFTERCARE_ID ? { name: 'אחרי', img: 'blanket' } : catOf(c.cat);
    const to = c.to === 'B' ? 'לשניכם' : 'ל' + roleName(c.to);
    const lashes = c.lvl ? '<span class="lvl">' + [1, 2, 3].map((i) => `<i class="${i <= c.lvl ? 'on' : ''}"></i>`).join('') + '</span>' : '';
    const art = mediaArtHtml(c, 'tv-art') || `<div class="tv-art">${illus(c.img || cat.img)}</div>`;
    const prog = playMode === 'session' && S.session ? `${S.session.idx + 1} / ${S.session.cards.length}` : 'קלף אקראי';
    return `<div class="tv-top"><span class="tv-brand">קטיפה</span><span class="tv-prog">${prog}</span><span class="tv-lead">${illus('key')} ${roleName('D')} ${S.partners[S.dom].g === 'm' ? 'מוביל' : 'מובילה'}${alternating() ? ` · הבא: ${roleName('S')}` : ''}</span><span class="tv-timer" id="tv-timer"></span><span class="tv-safe">מילת העצירה: ${esc(S.safeword)}</span></div>
      <div class="tv-main">${art}
        <div class="tv-text"><div class="tv-chips"><span class="chip to">${esc(to)}</span><span class="chip cat">${cat.name}</span>${lashes}</div>
          <p class="tv-p">${render(c.text)}</p>${c.safe && S.showSafety ? `<p class="tv-safe-note">⚠ ${esc(c.safe)}</p>` : ''}</div></div>
      <div class="tv-bar">
        <button class="tv-btn stop" data-tv="stop">עצור</button>
        <button class="tv-btn primary" data-tv="next">${playMode === 'session' ? 'בוצע, הבא' : 'קלף אחר'}</button>
        ${playMode === 'session' ? '<button class="tv-btn" data-tv="skip">דילוג</button>' : ''}
        ${c.min ? `<button class="tv-btn" data-tv="timer" data-min="${c.min}">⏱ ${c.min} דק׳</button>` : ''}
        ${typeAvailable(S.media[c.id] || {}, 'personal') && typeAvailable(S.media[c.id] || {}, 'demo') ? `<button class="tv-btn" data-tv="vidpref">${activeVidType(S.media[c.id] || {}) === 'personal' ? 'להדגמה' : 'לסרטון האישי'}</button>` : ''}
        ${activeVidSlot(S.media[c.id] || {}) ? `<button class="tv-btn" data-tv="vfull">${tvVideoFull ? 'חזרה לכרטיס' : '⛶ סרטון במסך מלא'}</button>` : ''}
        <button class="tv-btn" data-tv="dice">קוביות</button>
        <button class="tv-btn" data-tv="cast" ${'PresentationRequest' in window ? '' : 'hidden'}>${tvConn ? '📡 משודר' : '📡 Chromecast'}</button>
        <button class="tv-btn" data-tv="exit">יציאה</button>
      </div>`;
  }
  function tvDiceView() {
    const sets = diceSets(), r = diceResult || { action: sets.action[0], body: sets.body[0], time: sets.time[0] };
    return `<div class="tv-top"><span class="tv-brand">קטיפה</span><span class="tv-prog">קוביות</span><span class="tv-timer" id="tv-timer"></span><span class="tv-safe">מילת העצירה: ${esc(S.safeword)}</span></div>
      <div class="tv-dice">${[['action', 'פעולה', r.action.img || 'hand'], ['body', 'איפה', 'figure'], ['time', 'כמה', 'stopwatch']].map(([k, l, img]) =>
        `<div class="die ${rolling ? 'spin' : ''}">${illus(img)}<small>${l}</small><b>${esc(r[k].t)}</b></div>`).join('')}</div>
      <p class="tv-sentence">${diceResult ? `<b>${roleName('D')}</b>: ${esc(r.action.t)} <b>${esc(r.body.t)}</b> של ${roleName('S')}, ${esc(r.time.t)}.` : 'לחצו ״גלגלו״.'}</p>
      <div class="tv-bar">
        <button class="tv-btn stop" data-tv="stop">עצור</button>
        <button class="tv-btn primary" data-tv="roll">גלגלו</button>
        ${diceResult && diceResult.time.sec ? `<button class="tv-btn" data-tv="timer" data-sec="${diceResult.time.sec}">⏱ ${esc(diceResult.time.t)}</button>` : ''}
        <button class="tv-btn" data-tv="card">${S.session || randomCard ? 'חזרה לכרטיס' : 'קלף אקראי'}</button>
        <button class="tv-btn" data-tv="exit">יציאה</button>
      </div>`;
  }
  function tvEmptyView() {
    return `<div class="tv-top"><span class="tv-brand">קטיפה</span><span class="tv-safe">מילת העצירה: ${esc(S.safeword)}</span></div>
      <div class="tv-empty">${illus('ring')}<h1>קטיפה</h1><p>${roleName('D')} ${S.partners[S.dom].g === 'm' ? 'מוביל' : 'מובילה'} · ${roleName('S')} ${S.partners[sub()].g === 'm' ? 'מובל' : 'מובלת'}</p></div>
      <div class="tv-bar"><button class="tv-btn primary" data-tv="start">התחל ערב</button><button class="tv-btn" data-tv="random">קלף אקראי</button><button class="tv-btn" data-tv="dice">קוביות</button><button class="tv-btn" data-tv="exit">יציאה</button></div>`;
  }
  function renderTv() {
    const stage = $('#tv-stage'); if (!stage) return;
    let html;
    if (tvView === 'dice') html = tvDiceView();
    else {
      const c = currentCard();
      if (c) html = tvCardView(c);
      else if (playMode === 'session' && S.session) { html = `<div class="tv-top"><span class="tv-brand">קטיפה</span></div><div class="tv-empty">${illus('heart')}<h1>זה היה הערב</h1><p>מים, שמיכה, ומילה טובה.</p></div><div class="tv-bar"><button class="tv-btn primary" data-tv="finish">סיום</button></div>`; }
      else html = tvEmptyView();
    }
    stage.innerHTML = html;
    stage.classList.toggle('vfull', tvVideoFull && tvView === 'card' && !!$('.tv-art.media', stage));
    hydrateCard(stage).then(() => { if (stage.classList.contains('vfull')) { const v = $('.tv-art.media video', stage); if (v) { v.muted = true; v.play().catch(() => {}); } } });
    timerDraw();
    $$('[data-tv]', stage).forEach((b) => b.addEventListener('click', () => tvAction(b.dataset.tv, b)));
    tvSend();
  }
  function tvAction(a, b) {
    const c = currentCard();
    if (a === 'exit') return exitTv();
    if (a === 'stop') return openStop();
    if (a === 'next') { if (playMode === 'session') sessionAdvance(); else pickRandom(); tvView = 'card'; return renderTv(); }
    if (a === 'skip') { if (c) sessionSkip(c); return renderTv(); }
    if (a === 'timer') { timerSet(b.dataset.sec ? +b.dataset.sec : +b.dataset.min * 60); timerStart(); return; }
    if (a === 'dice') { tvView = 'dice'; return renderTv(); }
    if (a === 'card') { if (!S.session && !randomCard) { playMode = 'random'; pickRandom(); } tvView = 'card'; return renderTv(); }
    if (a === 'roll') { if (rolling) return; rolling = true; const sets = diceSets(), pick = (x) => x[Math.floor(Math.random() * x.length)]; let n = 0; const iv = setInterval(() => { diceResult = { action: pick(sets.action), body: pick(sets.body), time: pick(sets.time) }; if (++n >= 8) { clearInterval(iv); rolling = false; if (alternating()) { flipRoles(); save(); } } renderTv(); }, 90); return; }
    if (a === 'start') { if (S.roleMode === 'random') { S.dom = Math.random() < 0.5 ? 'a' : 'b'; S.eveningAlt = Math.random() < 0.5; } buildSession(); playMode = 'session'; tvView = 'card'; return renderTv(); }
    if (a === 'random') { playMode = 'random'; pickRandom(); tvView = 'card'; return renderTv(); }
    if (a === 'finish') { S.session = null; save(); return renderTv(); }
    if (a === 'cast') return tvCast();
    if (a === 'vfull') { tvVideoFull = !tvVideoFull; return renderTv(); }
    if (a === 'vidpref') { S.vidPref = (S.vidPref || 'personal') === 'personal' ? 'demo' : 'personal'; save(); return renderTv(); }
  }
  // שידור ל-Chromecast דרך Presentation API (Chrome באנדרואיד ובמחשב). המקלט הוא אותה אפליקציה עם ?tv=1.
  async function tvCast() {
    if (!('PresentationRequest' in window)) return;
    if (tvConn) { dialog('<h2>שידור פעיל</h2>', [{ label: 'ניתוק', cls: 'danger', onClick: () => { try { tvConn.terminate(); } catch { /* */ } tvConn = null; renderTv(); } }, { label: 'סגירה' }]); return; }
    try {
      tvReq = tvReq || new PresentationRequest([TV_URL()]);
      const conn = await tvReq.start();
      tvConn = conn;
      conn.addEventListener('connect', () => { renderTv(); });
      conn.addEventListener('close', () => { tvConn = null; if (tvOn) renderTv(); });
      conn.addEventListener('terminate', () => { tvConn = null; if (tvOn) renderTv(); });
      renderTv();
    } catch (e) { dialog(`<h2>לא הצלחתי לשדר</h2><p class="tiny">${esc(e.message || '')}</p><p>הדרך שעובדת בכל טלפון: שיקוף מסך (AirPlay באייפון, Smart View / Cast באנדרואיד) כשהטלפון במצב טלוויזיה ובאופק.</p>`, [{ label: 'סגירה' }]); }
  }
  async function tvSend() {
    if (!tvConn || tvConn.state !== 'connected') return;
    const stage = $('#tv-stage');
    const used = {}; $$('use', stage).forEach((u) => { const id = (u.getAttribute('href') || '').slice(4); if (CUSTOM_ILLUS[id]) used[id] = CUSTOM_ILLUS[id]; });
    const images = {};
    for (const el of $$('[data-media]', stage)) { const img = $('img', el); if (img && img.src.startsWith('blob:')) { try { const b = await (await fetch(img.src)).blob(); if (b.size < 900e3) images[el.dataset.media] = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch { /* */ } } }
    const clone = stage.cloneNode(true);
    $$('[data-media]', clone).forEach((el) => { const id = el.dataset.media; el.innerHTML = images[id] ? `<img src="${images[id]}" alt="">` : illus('camera'); });
    $$('.tv-bar', clone).forEach((el) => el.remove());
    try { tvConn.send(JSON.stringify({ html: clone.innerHTML, illus: used, timer: $('#tv-timer') ? $('#tv-timer').textContent : '' })); } catch { /* */ }
  }
  function tvReceiverInit() {
    document.body.classList.add('tv-on', 'tv-receiver');
    show('tv');
    const stage = $('#tv-stage');
    stage.innerHTML = `<div class="tv-empty">${illus('ring')}<h1>קטיפה</h1><p>ממתין לחיבור מהטלפון...</p></div>`;
    const apply = (data) => {
      try { const m = typeof data === 'string' ? JSON.parse(data) : data; Object.entries(m.illus || {}).forEach(([id, body]) => addCustomIllustration(id, body)); stage.innerHTML = m.html; const tt = $('#tv-timer'); if (tt) tt.textContent = m.timer || ''; } catch { /* */ }
    };
    window.__tvReceive = apply;
    if (navigator.presentation && navigator.presentation.receiver) {
      navigator.presentation.receiver.connectionList.then((list) => {
        const attach = (conn) => { conn.addEventListener('message', (e) => apply(e.data)); conn.addEventListener('close', () => { stage.innerHTML = `<div class="tv-empty">${illus('ring')}<h1>קטיפה</h1><p>החיבור נסגר.</p></div>`; }); };
        list.connections.forEach(attach);
        list.addEventListener('connectionavailable', (e) => attach(e.connection));
      });
    }
  }

  // ---------- עדכון גרסה בלי להסיר את האפליקציה ----------
  const ASSETS = ['index.html', 'css/style.css', 'js/app.js', 'js/cards-data.js', 'js/illustrations.js', 'js/media.js', 'manifest.webmanifest', 'sw.js'];
  async function hardRefresh() {
    dialog('<h2>מרענן...</h2><p class="muted">מוריד את הגרסה החדשה. ההגדרות, התמונות והסרטונים נשארים.</p>', []);
    try {
      if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); }
      if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); }
      await Promise.all(ASSETS.map((a) => fetch(a, { cache: 'reload' }).catch(() => null)));
    } catch { /* ממשיכים לרענון בכל מקרה */ }
    location.replace(location.pathname + '?r=' + Date.now());
  }
  $('#btn-refresh').addEventListener('click', hardRefresh);
  $('#update-bar button').addEventListener('click', hardRefresh);
  async function checkServerVersion() {
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = (await r.json()).version;
      if (v && v !== APP_VERSION) { $('#update-bar').hidden = false; $('#update-bar span').textContent = `גרסה חדשה (${v}) זמינה`; $('#app-version').textContent = `גרסה ${APP_VERSION} · זמינה ${v}`; }
    } catch { /* אין רשת */ }
  }
  function watchUpdates(reg) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) $('#update-bar').hidden = false; });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { reg.update().catch(() => {}); checkServerVersion(); } });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }

  // ---------- רשימת כל המשימות להעתקה: כל משימה פעמיים, הגבר מוביל / האשה מובילה ----------
  const COPY_CTX = [
    { key: 'm', label: 'הגבר מוביל', ctx: { D: 'הגבר', S: 'האשה', dg: 'm', sg: 'f' } },
    { key: 'f', label: 'האשה מובילה', ctx: { D: 'האשה', S: 'הגבר', dg: 'f', sg: 'm' } },
  ];
  const toPlain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
  function copyText(text, btn) {
    const done = () => { if (btn) { const t = btn.textContent; btn.textContent = 'הועתק ✓'; btn.classList.add('on'); setTimeout(() => { btn.textContent = t; btn.classList.remove('on'); }, 1200); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch { dialog(`<h2>העתקה ידנית</h2><textarea rows="6" style="width:100%">${esc(text)}</textarea>`, [{ label: 'סגירה' }]); }
    ta.remove();
  }
  // ל/ב/כ לפני ה׳ הידיעה בולעות אותה: "להגבר" -> "לגבר", "באשה" ולא "בהאשה"
  const fixHe = (t) => t.replace(/(^|[\s״"'(,.:;!?-])([לבכ])ה(גבר|אשה)/g, '$1$2$3');
  const DEFAULT_PROMPT_STYLE = 'Cinematic photorealistic scene. The two adult characters exactly as in the attached reference image (keep faces, hair, bodies and skin tone identical; the man and the woman from the reference). Setting: the exact room, background, furniture, lighting and props of the reference image, unchanged; only if the reference shows no setting at all, a dark bedroom at night with candlelight, deep red velvet and brass. 85mm lens, shallow depth of field, soft film grain, moody chiaroscuro, intimate and intense. No text, no watermark, no extra people.';
  const DEFAULT_PROMPT_VIDEO = '10 seconds, one continuous shot, no cuts, no text. Slow push-in on a gimbal, candle flicker on skin, shallow focus, natural breathing. 0-2s: the START position exactly as described. 2-8s: the MOVE, continuous and clearly readable, nothing added. 8-10s: the END FRAME, held still.';
  const CAT_EN = { control: 'dominance and control', sensory: 'sensory play', bondage: 'bondage and restraint', impact: 'impact play (spanking, paddle, flogger)', denial: 'teasing, edging and orgasm control', roleplay: 'role play', oral: 'oral sex', toys: 'toys', words: 'commands and dirty talk', exhibit: 'exhibition and being watched', anal: 'anal play and rimming', feet: 'feet', throat: 'hand on the throat (gesture only, no pressure)', fluids: 'spit and watersports', cum: 'cum play', aftercare: 'aftercare, closing' };
  const DEFAULT_PROMPT_IMG = 'Photorealistic, candlelit, cinematic, shallow depth of field.';
  const DEFAULT_PROMPT_KEEP = 'Keep from the reference image, unchanged: the two people exactly as they are (faces, hair, skin tone, body shape, body hair, tattoos, jewelry); the full anatomy of both, the man\'s penis and testicles and the woman\'s breasts and vulva, present and visible whenever the pose shows them, never erased, hidden, blurred or covered; and the same room, background, furniture, lighting, colors and props. Change only what the action requires. Forbidden: a different room or background, added or removed objects, added clothing, missing or censored genitals, altered body proportions, extra people.';
  const DEFAULT_PROMPT_ACT = 'Show exactly the ACTION above and nothing else: the same two people, the same positions, the same body parts, the same movement, the same end frame. Do not add people, objects or a different activity; do not cut away, do not change position mid-shot. Both bodies stay complete and anatomically intact throughout, genitals included. The action and the body parts involved stay in frame and unobstructed from the first frame to the last. Any fluid comes from the body part named and nowhere else: urine flows from the genitals (the tip of the cock, or from between the labia), saliva falls from the mouth and lips, semen spurts from the tip of the cock; show the source, the stream or string in the air, and where it lands.';
  function buildPrompt(c, v, kind) {
    const e = entryText(c, v);
    const man = v.key === 'm', giver = man ? 'the man' : 'the woman', recv = man ? 'the woman' : 'the man';
    const shot = shotFor(c, v), en = enFor(c, v), cap = (t) => t[0].toUpperCase() + t.slice(1);
    const style = (S.promptStyle || DEFAULT_PROMPT_STYLE).trim();
    const video = (S.promptVideo || DEFAULT_PROMPT_VIDEO).trim();
    const act = (S.promptAct || DEFAULT_PROMPT_ACT).trim();
    const keep = (S.promptKeep || DEFAULT_PROMPT_KEEP).trim();
    // פירוק תיאור הצילום לשלושה שלבים מפורשים: פתיחה, תנועה, פריים סיום (מיפוי ישיר לציר הזמן של הסרטון)
    const beatsOf = (t) => {
      const m = t.match(/^([\s\S]*?)(?:\s*End frame:\s*([\s\S]*))?$/); const bodyT = (m && m[1] || t).trim(); const endT = (m && m[2] || '').trim();
      let sents = bodyT.split(/(?<=\.)\s+/).filter(Boolean);
      if (sents.length < 2) { const parts = bodyT.split(/;\s*/); sents = parts.length > 1 ? [parts[0].replace(/\.?$/, '.'), parts.slice(1).join('; ')] : [bodyT]; }
      const cap1 = (x) => x ? x[0].toUpperCase() + x.slice(1) : x;
      return { start: cap1(sents[0]), move: cap1(sents.length > 1 ? sents.slice(1).join(' ') : sents[0]), end: cap1(endT) };
    };
    const bt = shot ? beatsOf(shot) : null;
    const action = bt
      ? `ACTION, in three beats that the video follows in order.\nSTART (position before anything moves): ${bt.start}\nMOVE (the act itself, continuous, exactly this and nothing else): ${bt.move}${bt.end ? `\nEND FRAME (held still at the end): ${bt.end}` : ''}`
      : `ACTION (show exactly this; it is written as a task for the couple, perform it literally): ${en || e.text}`;
    const perf = c.to === 'B' ? 'Both do it together.' : `${cap(c.to === 'D' ? giver : recv)} is the one carrying out the instruction; the other responds.`;
    // תמונה: פריים המפתח של האקט (בלי שלב ההכנה ובלי פריים הסיום), ומה התמונה צריכה להגיד במבט אחד
    const body = bt ? [bt.start, bt.move] : [];
    const keyFrame = shot
      ? `KEY FRAME (this is the picture): ${body.join(' ')} Of all this, show the single instant in which the act is at its fullest: the contact, the stream, the grip or the insertion described, fully happening, with the position and the body parts named all visible at once and filling the frame. Not the moment before it and not the aftermath.`
      : `KEY FRAME (this is the picture): the single instant in which this task is at its fullest, the act itself happening, with both people and the body parts involved clearly visible and filling the frame. Not the setup and not the aftermath. The task: ${en || e.text}`;
    const essence = `TASK (what the picture must say at a glance): ${en || e.text}`;
    const lines = kind === 'video' ? [
      action,
      `PEOPLE: the man and the woman from the attached reference image, no one else. ${cap(giver)} leads and performs the action on ${recv}; ${recv} is led and follows. ${perf}`,
      `PRESERVE: ${keep}`,
      `LOOK: ${style}`,
      `VIDEO: ${video}`,
      `RULES: ${act}`,
    ] : null;
    if (kind !== 'video') {
      // תמונה: קצר וממצה. הפריים עצמו, שורה על האנשים והאנטומיה, סגנון במילים ספורות.
      const frame = bt ? `${bt.start} ${bt.move}` : (en || `Depict this task (written in Hebrew; translate it and show the act itself): ${e.text}`);
      const imgStyle = (S.promptImg || DEFAULT_PROMPT_IMG).trim();
      return [
        frame,
        `Pose locked exactly as described above: who stands, kneels or lies and in which direction, where each hand, mouth and body part is. Do not change, simplify or mirror the pose.`,
        `Exactly two people, the man and the woman from the reference image: same faces, hair, bodies, same room and props. Both fully nude unless the scene above says otherwise. The man's penis and testicles are clearly visible, the woman's breasts and vulva are visible. Each has two arms, two legs and five fingers per hand, nothing missing, nothing added. No one and nothing else in the frame.`,
        imgStyle + (CAT_EN[c.cat] ? ` Tags: ${CAT_EN[c.cat]}, exact pose, two people, full body visible.` : ''),
      ].join('\n');
    }
    lines.splice(0, lines.length, ...lines.filter(Boolean));
    return lines.join('\n');
  }
  function entryText(c, v) { const who = c.to === 'B' ? 'לשניהם' : fixHe('ל' + (c.to === 'D' ? v.ctx.D : v.ctx.S)); return { who, text: fixHe(toPlain(render(c.text, v.ctx))) }; }
  // ---------- תרגום המשימות לאנגלית (לפרומפטים) ----------
  const TR_SYSTEM = 'You translate short Hebrew instructions from a private intimacy app used by one adult couple into natural, clear, direct English, to be used as scene descriptions for image and video generation. Translate the meaning exactly and completely: do not soften, censor, summarize, moralize or add anything. The two people are always "the man" and "the woman"; one leads and the other is led. Keep durations, counts, body parts, objects and the order of actions exactly. Reply with ONLY a JSON array of strings, one per input string, in the same order, with no commentary.';
  const enKey = (c, v) => `${c.id}:${v.key}`;
  const hashStr = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h.toString(36); };
  const EN_CTX = { m: { D: 'the man', S: 'the woman', dg: 'm', sg: 'f' }, f: { D: 'the woman', S: 'the man', dg: 'f', sg: 'm' } };
  const capEn = (t) => t.replace(/(^|[.!?:]\s+|["“(]\s*)(the (?:man|woman))/g, (m, p, w) => p + w[0].toUpperCase() + w.slice(1));
  function shotFor(c, v) { return (typeof CARDS_SHOT !== 'undefined' && CARDS_SHOT[c.id]) ? capEn(toPlain(render(CARDS_SHOT[c.id], EN_CTX[v.key]))) : null; }
  function enFor(c, v) {
    if (typeof CARDS_EN !== 'undefined' && CARDS_EN[c.id]) return capEn(toPlain(render(CARDS_EN[c.id], EN_CTX[v.key])));
    const e = (S.en || {})[enKey(c, v)]; if (!e) return null; return e.h === hashStr(entryText(c, v).text) ? e.t : null;
  }
  async function translateEntries(items, onProgress) {
    const { key, model } = S.ai;
    const Anthropic = await loadSdk();
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
    S.en = S.en || {};
    let done = 0, failed = 0, lastErr = '';
    for (let i = 0; i < items.length; i += 12) {
      const batch = items.slice(i, i + 12);
      const inputs = batch.map(({ c, v }) => entryText(c, v).text);
      try {
        const req = { model, max_tokens: 8000, output_config: { effort: 'low' }, system: TR_SYSTEM, messages: [{ role: 'user', content: JSON.stringify(inputs) }] };
        const res = model !== 'claude-haiku-5-5'
          ? await client.beta.messages.create({ ...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
          : await client.messages.create(req);
        if (res.stop_reason === 'refusal') throw new Error('המודל סירב לתרגם קבוצה של משימות');
        const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
        const m = text.match(/\[[\s\S]*\]/); if (!m) throw new Error('תשובה לא תקינה מהמודל');
        const arr = JSON.parse(m[0]); if (!Array.isArray(arr) || arr.length !== inputs.length) throw new Error('מספר התרגומים לא תואם');
        batch.forEach(({ c, v }, j) => { S.en[enKey(c, v)] = { h: hashStr(inputs[j]), t: String(arr[j]).trim() }; });
        done += batch.length; save();
      } catch (e) { failed += batch.length; lastErr = e.message || String(e); }
      onProgress && onProgress(done + failed, items.length);
    }
    return { done, failed, lastErr };
  }

  let listCat = 'all';
  // חריץ הסרטון של נוסח מסוים: ״הגבר מוביל״ = החריץ של בן הזוג שהוא הגבר (ואם שניהם מאותו מין: א׳ לנוסח הראשון, ב׳ לשני)
  function slotForVariant(kind, v) {
    const ga = S.partners.a.g, gb = S.partners.b.g;
    const who = ga !== gb ? (v.key === 'm' ? (ga === 'm' ? 'a' : 'b') : (ga === 'f' ? 'a' : 'b')) : (v.key === 'm' ? 'a' : 'b');
    return (kind === 'demo' ? 'demo' : 'vid') + who.toUpperCase();
  }
  function mediaBtnsHtml(c, v) {
    const m = S.media[c.id] || {}, vs = slotForVariant('vid', v), ds = slotForVariant('demo', v);
    return `<button class="mslot ${m.img ? 'on' : ''}" data-media="img" data-id="${c.id}" data-v="${v.key}">🖼 ${m.img ? 'תמונה ✓' : 'העלאת תמונה'}</button>
      <button class="mslot ${m[vs] ? 'on' : ''}" data-media="${vs}" data-id="${c.id}" data-v="${v.key}">🎬 ${m[vs] ? 'סרטון אישי ✓' : 'העלאת סרטון אישי'}</button>
      <button class="mslot ${m[ds] ? 'on' : ''}" data-media="${ds}" data-id="${c.id}" data-v="${v.key}">🎬 ${m[ds] ? 'הדגמה ✓' : 'העלאת הדגמה'}</button>`;
  }
  function renderCopyList() {
    const host = $('#list-body');
    const allGroups = CATEGORIES.concat([{ id: AFTERCARE_ID, name: 'אחרי', img: 'blanket' }]).map((cat) => ({ cat, cards: allCards().filter((c) => c.cat === cat.id) })).filter((g) => g.cards.length);
    if (listCat !== 'all' && !allGroups.some((g) => g.cat.id === listCat)) listCat = 'all';
    const filt = $('#list-filters');
    filt.innerHTML = `<button class="chip ${listCat === 'all' ? 'on' : ''}" data-cat="all">הכול</button>` + allGroups.map((g) => `<button class="chip ${listCat === g.cat.id ? 'on' : ''}" data-cat="${g.cat.id}">${g.cat.name} <small>${g.cards.length}</small></button>`).join('');
    $$('.chip', filt).forEach((b) => b.addEventListener('click', () => { listCat = b.dataset.cat; renderCopyList(); filt.scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
    const groups = allGroups.filter((g) => listCat === 'all' || g.cat.id === listCat);
    const curName = listCat === 'all' ? '' : groups[0].cat.name;
    const all = [], missing = []; let translated = 0;
    host.innerHTML = groups.map(({ cat, cards }) => {
      const lines = [];
      const rows = cards.map((c, i) => COPY_CTX.map((v) => {
        const e = entryText(c, v); const line = `${e.text}`; lines.push(line); all.push(line); const en = enFor(c, v), shot = shotFor(c, v); if (!en) missing.push({ c, v }); else translated++;
        return `<div class="cp-row"><div class="cp-head"><span class="chip ${v.key === 'm' ? 'cat' : 'to'}">${v.label}</span><small>הוראה ${e.who} · עוצמה ${c.lvl || 'אחרי'}</small></div><p>${esc(e.text)}</p>${en ? `<p class="en" dir="ltr">${esc(en)}</p>` : ''}${shot ? `<p class="en shot" dir="ltr"><b>Shot:</b> ${esc(shot)}</p>` : ''}<div class="cp-actions"><button class="btn ghost small cp-btn" data-copy="${esc(e.text)}">העתקה</button>${en ? `<button class="btn ghost small cp-btn" data-copy="${esc(en)}">English</button>` : ''}<button class="btn ghost small cp-btn" data-prompt="image" data-id="${c.id}" data-v="${v.key}">פרומפט תמונה</button><button class="btn ghost small cp-btn" data-prompt="video" data-id="${c.id}" data-v="${v.key}">פרומפט סרטון</button></div><div class="cp-actions cp-media">${mediaBtnsHtml(c, v)}</div></div>`;
      }).join('')).join('');
      return `<section class="cp-group" data-cat="${cat.id}"><div class="cp-group-head">${illus(cat.img)}<h2>${cat.name}</h2><small>${cards.length} משימות × 2</small><button class="btn ghost small" data-copy-all="${esc(lines.join('\n\n'))}">העתקת הקטגוריה</button></div>${rows}</section>`;
    }).join('');
    $('#list-count').textContent = `${all.length / 2} משימות, ${all.length} נוסחים${curName ? ' · מסונן: ' + curName : ''}`;
    $('#list-copy-all').textContent = curName ? 'העתקת הקטגוריה' : 'העתקת הכול';
    const trBtn = $('#list-translate');
    trBtn.disabled = false;
    trBtn.hidden = !missing.length;
    trBtn.textContent = `תרגום לאנגלית של המשימות שהוספתם (Claude) · ${missing.length}`;
    $('#list-tr-status').textContent = missing.length ? `${translated} מתוך ${all.length} נוסחים באנגלית${curName ? ' בקטגוריה' : ''}. ${missing.length} נוסחים של משימות שהוספתם עדיין בעברית.` : `כל ${all.length} הנוסחים${curName ? ' בקטגוריה' : ''} באנגלית. הפרומפטים לתמונה ולסרטון באנגלית מלאה.`;
    trBtn.onclick = async () => {
      if (!missing.length) return;
      if (!S.ai.key) { dialog('<h2>חסר מפתח API</h2><p>התרגום נעשה עם Claude דרך המפתח שמוגדר ב״איורים ב-AI״. המפתח נשמר רק בטלפון.</p>', [{ label: 'להגדרת המפתח', cls: 'primary', onClick: () => show('ai') }, { label: 'סגירה' }]); return; }
      trBtn.disabled = true; trBtn.textContent = `מתרגם… 0/${missing.length}`;
      try {
        const r = await translateEntries(missing, (d, t) => { trBtn.textContent = `מתרגם… ${d}/${t}`; });
        renderCopyList();
        if (r.failed) dialog(`<h2>תורגמו ${r.done}, נכשלו ${r.failed}</h2><p class="muted">${esc(r.lastErr)}</p><p>אפשר ללחוץ שוב כדי לנסות את החסרים.</p>`, [{ label: 'סגירה' }]);
      } catch (e) { renderCopyList(); dialog(`<h2>התרגום נכשל</h2><p class="muted">${esc(e.message || String(e))}</p>`, [{ label: 'סגירה' }]); }
    };
    $('#list-copy-videos').textContent = curName ? `פרומפטי הסרטון: ${curName}` : 'העתקת כל פרומפטי הסרטון';
    $('#list-copy-all').onclick = (e) => copyText(all.join('\n\n'), e.currentTarget);
    const allPrompts = (kind) => groups.flatMap(({ cat, cards }) => cards.flatMap((c) => COPY_CTX.map((v) => `### ${cat.name} · ${v.label}\n${buildPrompt(c, v, kind)}`))).join('\n\n');
    $('#list-copy-videos').onclick = (e) => copyText(allPrompts('video'), e.currentTarget);
    $('#list-download').onclick = () => {
      const txt = `קטיפה – פרומפטים לסרטונים (${new Date().toLocaleDateString('he-IL')})\n\n` + allPrompts('video');
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = u; a.download = 'ktifa-video-prompts' + (listCat === 'all' ? '' : '-' + listCat) + '.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
    };
    $$('[data-copy]', host).forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, b)));
    $$('[data-copy-all]', host).forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copyAll, b)));
    $$('[data-media]', host).forEach((b) => b.addEventListener('click', () => { const y = window.scrollY; mediaSlotDialog(b.dataset.id, b.dataset.media, () => { renderCopyList(); window.scrollTo(0, y); }); }));
    $$('[data-prompt]', host).forEach((b) => b.addEventListener('click', () => { const c = cardById(b.dataset.id), v = COPY_CTX.find((x) => x.key === b.dataset.v); if (c && v) copyText(buildPrompt(c, v, b.dataset.prompt), b); }));
    // הגדרות הפרומפט
    $('#prompt-style').value = S.promptStyle || DEFAULT_PROMPT_STYLE;
    $('#prompt-video').value = S.promptVideo || DEFAULT_PROMPT_VIDEO;
    $('#prompt-act').value = S.promptAct || DEFAULT_PROMPT_ACT;
    $('#prompt-keep').value = S.promptKeep || DEFAULT_PROMPT_KEEP;
    $('#prompt-img').value = S.promptImg || DEFAULT_PROMPT_IMG;
    $('#prompt-img').oninput = (e) => { S.promptImg = e.target.value; save(); };
    $('#prompt-keep').oninput = (e) => { S.promptKeep = e.target.value; save(); };
    $('#prompt-act').oninput = (e) => { S.promptAct = e.target.value; save(); };
    $('#prompt-style').oninput = (e) => { S.promptStyle = e.target.value; save(); };
    $('#prompt-video').oninput = (e) => { S.promptVideo = e.target.value; save(); };
    $('#prompt-reset').onclick = () => { S.promptStyle = ''; S.promptVideo = ''; S.promptAct = ''; S.promptKeep = ''; S.promptImg = ''; save(); renderCopyList(); };
  }

  // ---------- אתחול ----------
  async function init() {
    $('#sprite').innerHTML = illustrationSprite();
    Object.entries(S.customIllus || {}).forEach(([id, body]) => addCustomIllustration(id, body));
    buildPad();
    if (Object.values(S.media).some((m) => m && (m.kind || m.vid))) await migrateMedia();
    $('#app-version').textContent = 'גרסה ' + APP_VERSION;
    if (location.search.includes('r=')) history.replaceState(null, '', location.pathname);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').then(watchUpdates).catch(() => {});
    if (location.protocol.startsWith('http')) setTimeout(checkServerVersion, 1500);
    if (isReceiver) return tvReceiverInit();
    if (S.pinHash) await unlockFlow();
    if (!S.setupDone) startSetup(0); else show('home');
  }
  init();
})();
