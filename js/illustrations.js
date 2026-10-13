// איורים – ספרייט SVG של קווים (זהב על קטיפה). כל איור הוא <symbol> ב-viewBox 64×64.
const ILLUSTRATIONS = {
  blindfold: `<circle cx="32" cy="30" r="18"/><path d="M12 28h40l6-4M12 28l-6-4M14 28q18 10 36 0"/><path d="M22 48q10 6 20 0"/>`,
  ice: `<path d="M20 22l12-7 14 7-2 20-12 7-13-6z"/><path d="M20 22l13 6 13-6M33 28v21"/><path d="M26 54q0 5-3 5t-3-5q0-3 3-7 3 4 3 7z"/>`,
  whisper: `<path d="M26 44c-8 0-13-7-11-16 2-10 10-14 17-11 7 3 7 11 2 15-4 3-5 6-3 9"/><path d="M34 44c0 6-6 8-9 4"/><path d="M44 20q8 10 0 20M50 14q12 16 0 32"/>`,
  candle: `<rect x="22" y="26" width="18" height="30" rx="2"/><path d="M31 26v-6"/><path d="M31 6c-5 5-6 9 0 14 6-5 5-9 0-14z"/><path d="M26 26c-3 6 2 7 1 12M38 26c3 5-1 8 0 13"/><path d="M14 60h36"/>`,
  clothespin: `<path d="M22 8h8l2 24-6 24h-4l-6-24z"/><path d="M34 8h8l6 24-6 24h-4l-6-24z"/><path d="M24 30h16"/><circle cx="32" cy="30" r="3"/>`,
  headphones: `<path d="M12 40V32a20 20 0 0 1 40 0v8"/><rect x="8" y="38" width="10" height="16" rx="3"/><rect x="46" y="38" width="10" height="16" rx="3"/>`,
  hand: `<path d="M22 58V36l-8-10c-2-3 2-7 5-4l7 8V14c0-4 6-4 6 0v16M32 30V10c0-4 6-4 6 0v20M38 30V14c0-4 6-4 6 0v18M44 32V20c0-4 6-4 6 0v22c0 10-6 16-14 16h-6"/>`,
  scarf: `<path d="M10 20c10-8 18 8 28 0s12 4 16-2"/><path d="M10 28c10-8 18 8 28 0s12 4 16-2"/><path d="M10 20v8M54 18v8"/><path d="M40 26l-4 22M46 25l2 22M44 48l-3 10M48 47l3 10"/>`,
  rope: `<ellipse cx="32" cy="24" rx="20" ry="12"/><ellipse cx="32" cy="30" rx="20" ry="12"/><ellipse cx="32" cy="36" rx="20" ry="12"/><path d="M30 46c-4 6-4 10 0 14M34 46c4 6 4 10 0 14"/>`,
  bed: `<path d="M8 56V22h10v18h38v16M8 40h48"/><rect x="20" y="30" width="14" height="8" rx="3"/><path d="M8 48h48"/>`,
  kneel: `<circle cx="34" cy="12" r="6"/><path d="M34 18v18l-10 4v16M34 36l12 2 4 16"/><path d="M24 56h26M34 24l-10 6 4 6M34 24l10 4"/>`,
  eye: `<path d="M6 32q26-26 52 0-26 26-52 0z"/><circle cx="32" cy="32" r="9"/><circle cx="35" cy="29" r="2.5" fill="currentColor"/>`,
  paddle: `<path d="M22 8h20c6 0 10 4 10 10v18c0 6-4 10-10 10H22c-6 0-10-4-10-10V18c0-6 4-10 10-10z"/><path d="M26 46v12h12V46"/><path d="M32 30l-4-4a2.5 2.5 0 1 1 4-3 2.5 2.5 0 1 1 4 3z"/>`,
  hourglass: `<path d="M16 8h32M16 56h32M20 8c0 14 10 18 10 24s-10 10-10 24M44 8c0 14-10 18-10 24s10 10 10 24"/><path d="M26 16h12l-6 10zM32 44l-5 10h10z" fill="currentColor"/>`,
  lock: `<rect x="14" y="28" width="36" height="28" rx="4"/><path d="M22 28v-8a10 10 0 0 1 20 0v8"/><circle cx="32" cy="42" r="3"/><path d="M32 45v5"/>`,
  toy: `<rect x="24" y="8" width="16" height="44" rx="8"/><circle cx="32" cy="46" r="2"/><path d="M14 22q-6 10 0 20M8 16q-10 16 0 32M50 22q6 10 0 20M56 16q10 16 0 32"/>`,
  mask: `<path d="M6 26c8-8 18-6 26-2 8-4 18-6 26 2-2 14-10 20-18 18-4-1-6-4-8-6-2 2-4 5-8 6-8 2-16-4-18-18z"/><path d="M18 30q6-3 10 2M36 32q4-5 10-2"/><path d="M32 24v-8c0-6 6-8 10-6"/>`,
  chair: `<path d="M18 8v48M46 8v48M18 32h28M18 12h28M14 56h8M42 56h8"/><path d="M22 20h20"/>`,
  gloves: `<path d="M20 58V40l-6-10c-2-3 2-6 5-3l5 7V16c0-3 5-3 5 0v14M29 30V12c0-3 5-3 5 0v18M34 30V16c0-3 5-3 5 0v16M39 32V22c0-3 5-3 5 0v18c0 10-5 16-12 18"/><path d="M20 48h24M18 54h26"/>`,
  figure: `<circle cx="32" cy="10" r="6"/><path d="M32 16v22M18 24l14 4 14-4M32 38l-8 20M32 38l8 20"/>`,
  leash: `<circle cx="20" cy="18" r="10"/><path d="M20 8v4M20 24v4"/><path d="M28 24c8 6 12 14 18 18"/><circle cx="50" cy="48" r="7"/><path d="M12 18h-4"/>`,
  lips: `<path d="M8 32c8-10 16-12 24-6 8-6 16-4 24 6-8 12-16 16-24 14-8 2-16-2-24-14z"/><path d="M8 32q24 4 48 0"/><path d="M26 26q6-2 6 2 0-4 6-2"/>`,
  tongue: `<path d="M12 24q20-14 40 0-4 22-20 26-16-4-20-26z"/><path d="M12 24q20 6 40 0"/><path d="M24 30c0 10 3 16 8 18 5-2 8-8 8-18M32 32v12"/>`,
  collar: `<ellipse cx="32" cy="34" rx="22" ry="12"/><ellipse cx="32" cy="30" rx="22" ry="12"/><path d="M10 30v4M54 30v4"/><path d="M28 42h8v8h-8z"/><circle cx="32" cy="50" r="5"/>`,
  spoon: `<ellipse cx="32" cy="18" rx="10" ry="13"/><path d="M32 31v26"/><path d="M28 56q4 3 8 0"/>`,
  mirror: `<ellipse cx="32" cy="24" rx="16" ry="20"/><path d="M32 44v10M22 58h20M20 24q4-14 12-16"/>`,
  heart: `<path d="M32 56S8 40 8 24a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 16-24 32-24 32z"/>`,
  speech: `<path d="M10 12h44v30H30l-12 10V42h-8z"/><circle cx="22" cy="27" r="2" fill="currentColor"/><circle cx="32" cy="27" r="2" fill="currentColor"/><circle cx="42" cy="27" r="2" fill="currentColor"/>`,
  hanger: `<path d="M32 18a5 5 0 1 1 5-5"/><path d="M32 18v6L6 40q-2 4 2 4h48q4 0 2-4z"/>`,
  camera: `<rect x="8" y="18" width="48" height="34" rx="5"/><path d="M22 18l4-7h12l4 7"/><circle cx="32" cy="35" r="10"/><circle cx="32" cy="35" r="4"/><circle cx="48" cy="26" r="2" fill="currentColor"/>`,
  blanket: `<path d="M8 22q24-12 48 0v10q-24-12-48 0z"/><path d="M8 32q24-12 48 0v10q-24-12-48 0z"/><path d="M8 42q24-12 48 0v8q-24-12-48 0z"/>`,
  bath: `<path d="M6 32h52v8a14 14 0 0 1-14 14H20A14 14 0 0 1 6 40z"/><path d="M12 32V14a6 6 0 0 1 12 0"/><path d="M16 54l-2 6M48 54l2 6"/><path d="M34 20q-2 4 0 8M42 18q-2 5 0 10"/>`,
  oil: `<path d="M26 8h12v8l6 8v28a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V24l6-8z"/><path d="M20 36h24"/><path d="M32 46c-3-4-4-6 0-10 4 4 3 6 0 10z" fill="currentColor"/>`,
  lamp: `<path d="M20 58h24M32 58V40"/><path d="M32 40L16 20h32z"/><path d="M26 20V12h12v8"/><path d="M22 48q10 6 20 0"/>`,
  dice: `<rect x="10" y="10" width="44" height="44" rx="8"/><circle cx="22" cy="22" r="3.5" fill="currentColor"/><circle cx="42" cy="22" r="3.5" fill="currentColor"/><circle cx="32" cy="32" r="3.5" fill="currentColor"/><circle cx="22" cy="42" r="3.5" fill="currentColor"/><circle cx="42" cy="42" r="3.5" fill="currentColor"/>`,
  flame: `<path d="M32 6c-10 12-18 20-14 34 3 10 10 16 14 16s11-6 14-16c4-14-4-22-14-34z"/><path d="M32 30c-5 6-8 10-5 16 2 4 4 6 5 6s3-2 5-6c3-6 0-10-5-16z"/>`,
  stop: `<path d="M20 6h24l14 14v24L44 58H20L6 44V20z"/><path d="M26 44V30c0-6 4-6 4 0M30 30V22c0-4 4-4 4 0v8M34 24c0-4 4-4 4 0v8M38 28c0-3 4-3 4 0v10c0 6-4 10-10 10h-4"/>`,
  key: `<circle cx="20" cy="24" r="12"/><circle cx="20" cy="24" r="4"/><path d="M30 30l26 26M50 50l6-6M44 44l6-6"/>`,
  feather: `<path d="M50 8C30 10 18 26 14 50c24-4 40-16 36-42z"/><path d="M14 50L46 12"/><path d="M14 50l-6 8M24 40l-8 2M32 32l-8 1M40 24l-8 1"/>`,
  cuffs: `<circle cx="18" cy="36" r="12"/><circle cx="46" cy="36" r="12"/><circle cx="18" cy="36" r="6"/><circle cx="46" cy="36" r="6"/><path d="M26 28q6-10 12 0"/>`,
  brush: `<rect x="18" y="6" width="28" height="30" rx="10"/><path d="M28 36v22M36 36v22M28 58h8"/><path d="M26 14v16M32 12v18M38 14v16"/>`,
  cup: `<path d="M12 24h34v20a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10z"/><path d="M46 30h4a6 6 0 0 1 0 12h-4"/><path d="M22 18q-2-4 0-8M30 18q-2-4 0-8M38 18q-2-4 0-8"/>`,
  stopwatch: `<circle cx="32" cy="36" r="20"/><path d="M32 36V22M32 36l8 6"/><path d="M26 10h12M32 10v6M48 18l4-4"/>`,
  marker: `<path d="M14 50l6-18 26-26 12 12-26 26z"/><path d="M20 32l12 12M40 12l12 12"/><path d="M14 50l-4 10 10-4"/>`,
  phone: `<rect x="18" y="6" width="28" height="52" rx="5"/><path d="M28 12h8M32 52v.5"/>`,
  music: `<circle cx="20" cy="46" r="7"/><circle cx="46" cy="40" r="7"/><path d="M27 46V14l26-6v32"/><path d="M27 22l26-6"/>`,
  water: `<path d="M32 8c-12 16-18 24-14 36 3 8 9 12 14 12s11-4 14-12c4-12-2-20-14-36z"/><path d="M24 40q0 8 6 10"/>`,
  shoe: `<path d="M8 44h48v6a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2zM8 44c0-10 8-14 14-16l6-14 10 4-4 10c10 2 20 6 22 16"/>`,
  gear: `<circle cx="32" cy="32" r="10"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M13.6 50.4l5.7-5.7M44.7 19.3l5.7-5.7"/>`,
};

function illustrationSprite() {
  return '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' +
    Object.entries(ILLUSTRATIONS).map(([id, body]) =>
      `<symbol id="il-${id}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`
    ).join('') + '</svg>';
}

function illus(id, cls = '') {
  if (!ILLUSTRATIONS[id]) id = 'heart';
  return `<svg class="il ${cls}" aria-hidden="true"><use href="#il-${id}"/></svg>`;
}
