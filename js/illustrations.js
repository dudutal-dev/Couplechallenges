// איורים – ספרייט SVG של קווי זהב, סגנון ארט-דקו ארוטי. כל איור ב-viewBox 100×100.
const ILLUSTRATIONS = {
  // גוף ודמויות
  blindfold: `<path d="M50 8c17 0 27 13 27 31 0 21-12 39-27 39S23 60 23 39C23 21 33 8 50 8z"/><path d="M20 38q30-9 60 0v9q-30 7-60 0z"/><path d="M80 40c9 2 15 9 17 18M80 45c6 4 9 10 9 17"/><path d="M41 66q9-5 18 0M43 69q7 3 14 0"/><path d="M28 24c-8 12-7 30-4 46M72 24c8 12 7 30 4 46"/>`,
  kneel: `<circle cx="34" cy="20" r="8"/><path d="M29 30h12"/><path d="M38 29c5 10 3 20-1 30"/><path d="M40 35c7 3 9 10 6 17"/><path d="M35 42c-9 4-11 12-5 20"/><path d="M36 60c10-1 20-1 26 1 3 1 4 3 4 6l-2 17"/><path d="M64 84H42"/><path d="M20 90h60"/>`,
  figure: `<circle cx="50" cy="16" r="7"/><path d="M38 36c-5 10-6 18-2 28 2 8 1 18-3 30M62 36c5 10 6 18 2 28-2 8-1 18 3 30"/><path d="M38 36q12-6 24 0"/><path d="M40 38C32 30 32 16 40 6M60 38c8-8 8-22 0-32"/><path d="M26 94h12M62 94h12"/><path d="M44 52h12" stroke-dasharray="2 3"/>`,
  hourglass: `<path d="M28 8c7 15 3 26-6 36 9 11 13 22 6 48M72 8c-7 15-3 26 6 36-9 11-13 22-6 48"/><path d="M22 8h56M22 92h56"/><path d="M44 34h12M41 42h18M41 50h18M44 58h12"/><path d="M50 34v24" stroke-dasharray="2 3"/>`,
  rope: `<path d="M35 8c-2 18-10 28-10 48 0 13 6 26 10 36M65 8c2 18 10 28 10 48 0 13-6 26-10 36"/><path d="M44 8v10M56 8v10"/><path d="M50 22L32 42l18 20 18-20zM50 44L38 60l12 16 12-16z"/><path d="M32 42h36M38 60h24"/>`,
  back: `<path d="M30 10c0 16-8 24-8 40 0 14 8 24 16 32M70 10c0 16 8 24 8 40 0 14-8 24-16 32"/><path d="M44 10v8M56 10v8"/><path d="M50 20v50" stroke-dasharray="3 4"/><path d="M38 82c6-6 18-6 24 0"/>`,
  shoe: `<path d="M12 72c12-4 28-6 38-22 6-8 10-20 22-22 7 0 11 4 12 10l-9 2c-8 10-14 16-18 26-2 9-10 14-18 14H20z"/><path d="M78 42l6 36M12 72v8h40"/>`,
  garter: `<path d="M32 6c-5 30-1 60 10 88M68 6c5 30 1 60-10 88"/><path d="M27 42q23-9 46 0M27 51q23-9 46 0"/><path d="M42 47l-4 13M58 47l4 13"/><path d="M36 60h4M60 60h4"/>`,
  hand: `<path d="M12 94c4-24 14-38 32-46M88 94c-2-16-6-28-14-34"/><path d="M42 42c-4 8-3 19 4 25s17 6 24 0"/><path d="M47 44V27c0-4 6-4 6 0v14M53 41V22c0-4 6-4 6 0v19M59 41V26c0-4 6-4 6 0v18M65 44v-8c0-4 6-4 6 0v15c0 10-6 16-12 18"/>`,
  gloves: `<path d="M38 94V62c-6-8-10-20-8-34 1-8 6-14 8-20M62 94V62c6-8 10-20 8-34-1-8-6-14-8-20"/><path d="M38 8c6-3 18-3 24 0"/><path d="M40 20h20"/><path d="M50 8c-4 8-4 16 0 24s4 16 0 26" stroke-dasharray="2 4"/>`,
  // פנים ופה
  lips: `<path d="M10 50c12-16 24-18 40-10 16-8 28-6 40 10-12 18-24 24-40 22-16 2-28-4-40-22z"/><path d="M10 50q40 6 80 0"/><path d="M56 53v8h9v-8"/><path d="M42 42q8-3 8 2 0-5 8-2"/>`,
  tongue: `<path d="M18 40q32-22 64 0c-6 26-14 38-32 42C32 78 24 66 18 40z"/><path d="M18 40q32 8 64 0"/><path d="M40 52c0 14 4 26 10 30 6-4 10-16 10-30M50 54v20"/>`,
  whisper: `<path d="M34 46c-9 0-15-8-13-18 2-11 11-16 19-13 8 4 8 13 2 17-4 3-5 6-3 9"/><path d="M42 46c0 6-6 9-10 5"/><path d="M58 60c6-6 14-8 22-6 6 2 8 6 6 8-8 2-16 4-22 10"/><path d="M58 62q14 2 28 0"/><path d="M62 22q6 8 0 16M70 16q10 14 0 28"/>`,
  eye: `<path d="M6 50q44-38 88 0-44 38-88 0z"/><circle cx="50" cy="50" r="15"/><circle cx="50" cy="50" r="7" fill="currentColor"/><circle cx="56" cy="44" r="3" fill="var(--bg,#000)"/><path d="M20 38l-6-8M32 30l-3-9M50 27v-9M68 30l3-9M80 38l6-8"/>`,
  mask: `<path d="M6 42c12-12 28-9 44-3 16-6 32-9 44 3-3 20-14 29-26 26-7-2-11-7-18-10-7 3-11 8-18 10C20 71 9 62 6 42z"/><path d="M26 44q8-4 14 3M60 47q6-7 14-3"/><path d="M50 39v-12c0-8 8-10 12-6"/><path d="M14 46c-4 6-4 12 0 16M86 46c4 6 4 12 0 16"/>`,
  headphones: `<path d="M50 14c-16 0-26 12-26 30 0 18 11 34 26 34s26-16 26-34c0-18-10-30-26-30z"/><path d="M22 44q28-8 56 0v8q-28 6-56 0z"/><path d="M14 54V40a36 36 0 0 1 72 0v14"/><rect x="8" y="50" width="14" height="22" rx="5"/><rect x="78" y="50" width="14" height="22" rx="5"/>`,
  // אביזרים
  collar: `<path d="M12 44c0-10 17-18 38-18s38 8 38 18M12 44c0 10 17 18 38 18s38-8 38-18"/><path d="M12 44v12c0 10 17 18 38 18s38-8 38-18V44"/><path d="M44 62h12v10H44z"/><circle cx="50" cy="82" r="9"/><circle cx="24" cy="36" r="2" fill="currentColor"/><circle cx="76" cy="36" r="2" fill="currentColor"/><circle cx="50" cy="29" r="2" fill="currentColor"/>`,
  ring: `<circle cx="50" cy="44" r="30"/><circle cx="50" cy="44" r="21"/><path d="M40 74h20v9H40z"/><circle cx="50" cy="90" r="6"/><path d="M28 30q22-10 44 0" stroke-dasharray="3 4"/>`,
  leash: `<circle cx="26" cy="26" r="14"/><circle cx="26" cy="26" r="7"/><path d="M38 34c12 8 20 20 30 30"/><path d="M68 64c-6 6-6 14 0 20s14 4 18-2"/><path d="M72 62l6-6M78 68l6-6"/>`,
  cuffs: `<circle cx="28" cy="56" r="18"/><circle cx="72" cy="56" r="18"/><circle cx="28" cy="56" r="9"/><circle cx="72" cy="56" r="9"/><path d="M40 44q10-16 20 0"/><path d="M28 38v-6M72 38v-6"/>`,
  scarf: `<path d="M50 46c-14-14-30-6-18 6 12 12 18 2 18-6 14-14 30-6 18 6-12 12-18 2-18-6z"/><path d="M44 54c-10 10-16 22-14 38 8-6 14-16 20-30M56 54c10 10 16 22 14 38-8-6-14-16-20-30"/><path d="M34 14q16 10 32 0" stroke-dasharray="3 4"/>`,
  whip: `<path d="M12 22l16 16"/><path d="M8 28l10-10"/><ellipse cx="56" cy="60" rx="28" ry="20"/><ellipse cx="56" cy="60" rx="20" ry="13"/><ellipse cx="56" cy="60" rx="11" ry="6"/><path d="M28 38c6 2 10 6 12 12" stroke-dasharray="2 3"/>`,
  paddle: `<path d="M50 8c-16 0-30 12-30 28 0 10 6 16 12 22 6 5 10 10 10 18h16c0-8 4-13 10-18 6-6 12-12 12-22 0-16-14-28-30-28z"/><path d="M42 76v16h16V76"/><path d="M50 46l-8-8a5 5 0 1 1 8-6 5 5 0 1 1 8 6z"/>`,
  candle: `<path d="M34 40h24c2 0 4 2 4 4v42c0 3-2 5-5 5H35c-3 0-5-2-5-5V44c0-2 2-4 4-4z"/><path d="M46 40V30"/><path d="M46 8c-7 8-8 14 0 20 8-6 7-12 0-20z"/><path d="M38 40c-4 8 2 10 1 18M56 40c4 7-1 10 0 17"/><path d="M8 92c14-12 26-14 40-10 10 3 20 2 44-14" />`,
  ice: `<path d="M34 18l16-8 18 8-2 26-16 9-18-8z"/><path d="M34 18l18 8 16-8M52 26v27"/><path d="M8 92c12-14 26-20 44-18 12 2 22-2 40-14"/><path d="M48 60q0 7-4 7t-4-7q0-4 4-9 4 5 4 9z"/>`,
  feather: `<path d="M76 6C50 10 32 30 26 62c30-4 50-20 50-56z"/><path d="M26 62L70 14"/><path d="M26 62l-8 10M38 52l-10 2M48 42l-10 1M58 32l-10 1"/><path d="M8 92c14-10 28-12 48-8" />`,
  clothespin: `<path d="M30 10h12l3 34-9 36h-6l-9-36z"/><path d="M58 10h12l9 34-9 36h-6l-9-36z"/><path d="M34 42h32"/><circle cx="50" cy="42" r="5"/><circle cx="50" cy="42" r="1.5" fill="currentColor"/>`,
  toy: `<rect x="37" y="8" width="26" height="70" rx="13"/><circle cx="50" cy="68" r="3"/><path d="M26 30q-8 16 0 32M16 22q-14 24 0 48M74 30q8 16 0 32M84 22q14 24 0 48"/>`,
  lock: `<rect x="22" y="42" width="56" height="44" rx="8"/><path d="M34 42V30a16 16 0 0 1 32 0v12"/><path d="M50 58l-6-6a4 4 0 1 1 6-4 4 4 0 1 1 6 4z"/><path d="M50 62v10"/>`,
  key: `<circle cx="30" cy="36" r="18"/><circle cx="30" cy="36" r="8"/><path d="M44 48l40 40M72 76l8-8M64 68l8-8"/><path d="M30 10v8M30 54v8M4 36h8M48 36h8"/>`,
  chain: `<ellipse cx="18" cy="50" rx="10" ry="6"/><ellipse cx="34" cy="50" rx="6" ry="10"/><ellipse cx="50" cy="50" rx="10" ry="6"/><ellipse cx="66" cy="50" rx="6" ry="10"/><ellipse cx="82" cy="50" rx="10" ry="6"/>`,
  heart: `<path d="M50 88S12 62 12 36a17 17 0 0 1 38-8 17 17 0 0 1 38 8c0 26-38 52-38 52z"/><ellipse cx="32" cy="52" rx="7" ry="4"/><ellipse cx="44" cy="55" rx="7" ry="4"/><ellipse cx="56" cy="55" rx="7" ry="4"/><ellipse cx="68" cy="52" rx="7" ry="4"/>`,
  // מקום וחפצים
  bed: `<path d="M10 86V28h14v28h52V86M10 56h80M10 72h80"/><circle cx="30" cy="40" r="6"/><circle cx="44" cy="40" r="6"/><path d="M36 40h2"/><path d="M58 48h22c4 0 6 2 6 6v2H58z"/>`,
  chair: `<path d="M24 18v74M24 40h32M56 36v56M18 92h12M50 92h12"/><path d="M28 24h24"/><path d="M56 46c12 4 22 12 26 26l4 18"/><path d="M80 72l12 2-4 12"/>`,
  mirror: `<ellipse cx="50" cy="40" rx="26" ry="32"/><ellipse cx="50" cy="40" rx="20" ry="26" stroke-dasharray="3 4"/><path d="M50 72v14M34 88h32"/><circle cx="50" cy="26" r="5"/><path d="M50 32c-8 6-9 14-4 26M50 32c8 6 9 14 4 26"/>`,
  lamp: `<path d="M28 92h44M50 92V58"/><path d="M50 58L26 28h48z"/><path d="M42 28V18h16v10"/><path d="M30 70q20 10 40 0" stroke-dasharray="3 4"/>`,
  camera: `<rect x="20" y="10" width="60" height="80" rx="4"/><rect x="27" y="17" width="46" height="50"/><circle cx="50" cy="30" r="5"/><path d="M50 36c-8 4-10 14-6 28M50 36c8 4 10 14 6 28"/><circle cx="72" cy="80" r="3" fill="currentColor"/>`,
  phone: `<rect x="28" y="6" width="44" height="88" rx="8"/><path d="M42 14h16M50 86v.5"/><path d="M50 36c-8 4-10 14-6 28M50 36c8 4 10 14 6 28"/><circle cx="50" cy="30" r="5"/>`,
  blanket: `<path d="M8 70q42-22 84 0v18H8z"/><path d="M8 78q42-18 84 0" stroke-dasharray="3 4"/><circle cx="30" cy="48" r="9"/><circle cx="46" cy="54" r="8"/><path d="M38 58c12-6 26-6 38 4"/>`,
  bath: `<path d="M8 50h84v10a18 18 0 0 1-18 18H26A18 18 0 0 1 8 60z"/><path d="M14 50V26a6 6 0 0 1 12 0"/><path d="M20 78l-2 10M80 78l2 10"/><path d="M50 50c4-16 10-26 12-36M64 50c2-14 6-24 12-32"/><path d="M58 14l8-4M72 18l8-4"/>`,
  oil: `<path d="M40 6h20v10l8 10v36c0 4-3 7-7 7H39c-4 0-7-3-7-7V26l8-10z"/><path d="M32 42h36"/><path d="M50 56c-5-6-6-10 0-16 6 6 5 10 0 16z" fill="currentColor"/><path d="M8 94c14-10 28-14 44-10 12 3 22 0 40-12"/>`,
  spoon: `<ellipse cx="50" cy="24" rx="14" ry="18"/><path d="M50 42v46"/><path d="M44 86q6 4 12 0"/>`,
  brush: `<rect x="30" y="8" width="40" height="42" rx="14"/><path d="M44 50v38M56 50v38M44 88h12"/><path d="M40 18v22M50 14v28M60 18v22"/>`,
  hanger: `<path d="M50 26a7 7 0 1 1 7-7"/><path d="M50 26v6L10 56q-3 6 3 6h74q6 0 3-6z"/><path d="M28 62c0 10 4 18 10 22q12-4 12-22M50 62c0 10 4 18 12 22q10-4 10-22"/>`,
  speech: `<path d="M12 14h64v38H36L20 66V52h-8z"/><path d="M28 32c6-8 12-9 16-4 4-5 10-4 16 4-6 10-12 12-16 11-4 1-10-1-16-11z"/><path d="M28 32q16 3 32 0"/><circle cx="84" cy="80" r="8"/><circle cx="90" cy="92" r="3"/>`,
  cup: `<path d="M18 36h52v30a16 16 0 0 1-16 16H34a16 16 0 0 1-16-16z"/><path d="M70 44h8a9 9 0 0 1 0 18h-8"/><path d="M32 28q-3-6 0-12M44 28q-3-6 0-12M56 28q-3-6 0-12"/>`,
  dice: `<rect x="14" y="14" width="72" height="72" rx="12"/><path d="M32 36l-5-5a3 3 0 1 1 5-3 3 3 0 1 1 5 3zM68 36l-5-5a3 3 0 1 1 5-3 3 3 0 1 1 5 3zM50 54l-5-5a3 3 0 1 1 5-3 3 3 0 1 1 5 3zM32 72l-5-5a3 3 0 1 1 5-3 3 3 0 1 1 5 3zM68 72l-5-5a3 3 0 1 1 5-3 3 3 0 1 1 5 3z" fill="currentColor"/>`,
  stopwatch: `<circle cx="50" cy="56" r="32"/><path d="M50 56V34M50 56l14 10"/><path d="M40 12h20M50 12v12M76 26l6-6"/>`,
  marker: `<path d="M20 80l8-26 42-42 18 18-42 42z"/><path d="M28 54l18 18M62 20l18 18"/><path d="M20 80l-6 14 14-6"/>`,
  music: `<circle cx="30" cy="72" r="11"/><circle cx="72" cy="62" r="11"/><path d="M41 72V20l42-10v52"/><path d="M41 34l42-10"/>`,
  water: `<path d="M50 8C32 32 22 46 28 66c4 14 13 22 22 22s18-8 22-22c6-20-4-34-22-58z"/><path d="M36 62q0 12 10 16"/>`,
  flame: `<path d="M50 6C34 24 22 38 28 60c4 16 14 26 22 26s18-10 22-26c6-22-6-36-22-54z"/><path d="M50 44c-8 10-12 16-8 26 2 6 6 8 8 8s6-2 8-8c4-10 0-16-8-26z"/>`,
  stop: `<path d="M32 8h36l24 24v36L68 92H32L8 68V32z"/><path d="M40 70V46c0-8 6-8 6 0M46 46V34c0-6 6-6 6 0v12M52 36c0-6 6-6 6 0v12M58 42c0-5 6-5 6 0v16c0 10-6 16-16 16h-6"/>`,
  gear: `<circle cx="50" cy="50" r="16"/><path d="M50 8v12M50 80v12M8 50h12M80 50h12M20 20l9 9M71 71l9 9M20 80l9-9M71 29l9-9"/>`,
  corset: `<path d="M30 8c6 14 2 26-6 36 8 12 12 24 6 48h40c-6-24-2-36 6-48-8-10-12-22-6-36z"/><path d="M42 36h16M40 46h20M40 56h20M42 66h16"/><path d="M30 8q20 10 40 0"/>`,
  bite: `<path d="M12 48c12-14 24-16 38-8 14-8 26-6 38 8-12 20-24 26-38 24-14 2-26-4-38-24z"/><path d="M12 48q38 6 76 0"/><path d="M54 51v9h7v-9M61 51v7h6v-7"/>`,
};

function illustrationSprite() {
  return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' +
    Object.entries(ILLUSTRATIONS).map(([id, body]) =>
      `<symbol id="il-${id}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`
    ).join('') + '</svg>';
}

// איורים שנוצרו באפליקציה (AI). נטענים מה-state ומתווספים לספרייט בזמן ריצה.
const CUSTOM_ILLUS = {};
function addCustomIllustration(id, body) {
  CUSTOM_ILLUS[id] = body;
  const svg = document.querySelector('#sprite svg');
  if (!svg) return;
  let sym = svg.querySelector('#il-' + CSS.escape(id));
  if (!sym) { sym = document.createElementNS('http://www.w3.org/2000/svg', 'symbol'); sym.id = 'il-' + id; svg.appendChild(sym); }
  sym.setAttribute('viewBox', '0 0 100 100'); sym.setAttribute('fill', 'none'); sym.setAttribute('stroke', 'currentColor');
  sym.setAttribute('stroke-width', '2.6'); sym.setAttribute('stroke-linecap', 'round'); sym.setAttribute('stroke-linejoin', 'round');
  sym.innerHTML = body;
}
function removeCustomIllustration(id) {
  delete CUSTOM_ILLUS[id];
  const sym = document.querySelector('#sprite svg #il-' + CSS.escape(id)); if (sym) sym.remove();
}

function illus(id, cls = '') {
  if (!ILLUSTRATIONS[id] && !CUSTOM_ILLUS[id]) id = 'heart';
  return `<svg class="il ${cls}" aria-hidden="true"><use href="#il-${id}"/></svg>`;
}
