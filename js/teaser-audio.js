// פסקול הטיזר: מנוע קטן ב-Web Audio, בלי קבצים. שלושה סגנונות לפי האפליקציה:
// ktifa = טכנו פסיכדלי (קיק, בס מתגלגל, אסיד), breathe = אמביינט פסיכדלי (פאדים, ארפג׳ו עם הד, בלי קיק),
// masks = נואר/מסתורין (קונטרבס, מברשות, ויברפון עם הד, סווינג). העוצמה עולה עם התקדמות הערב (set(p)).
(function () {
  let A = null; // { ctx, bus, master }
  let st = null; // הסקוונסר הפעיל
  const nf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    try {
      if (!A) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; const ctx = new AC(); const bus = ctx.createDynamicsCompressor(); bus.threshold.value = -14; bus.knee.value = 10; bus.ratio.value = 12; bus.attack.value = 0.003; bus.release.value = 0.25; bus.connect(ctx.destination); const master = ctx.createGain(); master.gain.value = 0; master.connect(bus); A = { ctx, bus, master }; }
      if (A.ctx.state === 'suspended') A.ctx.resume();
    } catch (e) { return null; }
    return A;
  }
  const ready = () => !!A;
  // --- כלים ---
  function env(g, t, a, d, peak, sus) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + (sus || 0)); }
  function tone(type, f, t, a, d, peak, dest, detune, sus) { const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; const g = A.ctx.createGain(); env(g, t, a, d, peak, sus); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + d + (sus || 0) + 0.05); return o; }
  function noise(t, dur, filt, freq, q, peak, dest) { const ctx = A.ctx, len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2); const n = ctx.createBufferSource(); n.buffer = buf; const f = ctx.createBiquadFilter(); f.type = filt; f.frequency.value = freq; f.Q.value = q || 1; const g = ctx.createGain(); g.gain.value = peak; n.connect(f); f.connect(g); g.connect(dest); n.start(t); }
  function kick(t, peak, dest, hi) { const ctx = A.ctx, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(hi || 150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35); }
  function mkDelay(time, fb, wet) { const ctx = A.ctx, inp = ctx.createGain(), dl = ctx.createDelay(2), fbg = ctx.createGain(), wg = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; dl.delayTime.value = time; fbg.gain.value = fb; wg.gain.value = wet; inp.connect(A.master); inp.connect(dl); dl.connect(lp); lp.connect(fbg); fbg.connect(dl); lp.connect(wg); wg.connect(A.master); return { inp, dl, fbg, wg }; }
  function filtBus(cut, q) { const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = q || 0.8; f.connect(A.master); return f; }
  function padVoices(notes, type, gain, dest) { return notes.map((m, i) => { const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = nf(m); o.detune.value = (i % 2 ? 6 : -6); const g = A.ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(dest); o.start(); return { o, g }; }); }
  function glideChord(voices, notes, t, dur) { voices.forEach((v, i) => { const m = notes[i % notes.length]; v.o.frequency.cancelScheduledValues(t); v.o.frequency.setValueAtTime(v.o.frequency.value, t); v.o.frequency.exponentialRampToValueAtTime(nf(m), t + dur); }); }

  // --- סגנונות ---
  const STYLES = {
    ktifa: {
      bpm: (p) => 126 + 14 * p, swing: 0,
      build() { const s = st; s.padF = filtBus(380, 1.2); s.pad = padVoices([52, 55, 59], 'sawtooth', 0.045, s.padF); s.bassF = filtBus(220, 4); s.leadF = filtBus(500, 11); s.dly = mkDelay(0.1875, 0.3, 0.25); s.lead = [40, null, 43, 40, 47, null, 40, 52, null, 43, null, 40, 50, null, 47, 43]; s.roots = [28, 28, 31, 26]; },
      set(p, t) { const s = st, r = (prm, v) => { prm.cancelScheduledValues(t); prm.setValueAtTime(prm.value, t); prm.linearRampToValueAtTime(v, t + 2.5); }; r(s.padF.frequency, 380 + 1500 * p); r(s.bassF.frequency, 220 + 700 * p); r(s.leadF.frequency, 400 + 2600 * p); },
      step(k, t) {
        const s = st, p = s.p, beat = k % 4, bar = Math.floor(k / 16) % 4;
        if (beat === 0) kick(t, 0.55 + 0.3 * p, A.master);
        if (beat !== 0) tone('sawtooth', nf(s.roots[bar]), t, 0.004, 0.1, 0.3 + 0.1 * p, s.bassF);
        if (k % 2 === 1) noise(t, 0.035, 'highpass', 7500, 1, 0.05 + 0.08 * p, A.master);
        if (p > 0.35 && k % 8 === 6) noise(t, 0.16, 'highpass', 6000, 1, 0.06 + 0.06 * p, A.master);
        if (p > 0.5 && k % 8 === 4) noise(t, 0.09, 'bandpass', 1600, 1.2, 0.08 + 0.1 * p, A.master);
        if (p > 0.22) { const m = s.lead[k % 16]; if (m != null) { const oct = p > 0.7 && Math.floor(k / 64) % 2 === 1 ? 12 : 0; tone('sawtooth', nf(m + oct), t, 0.004, 0.16 + 0.1 * p, 0.17 + 0.08 * p, s.leadF, 0); if (k % 4 === 2) tone('square', nf(m + oct + 12), t, 0.004, 0.08, 0.05, s.dly.inp); } }
        if (p > 0.6 && k % 64 === 60) noise(t, 0.4, 'bandpass', 900, 0.8, 0.12, A.master);
      },
    },
    breathe: {
      bpm: (p) => 66 + 12 * p, swing: 0,
      build() { const s = st; s.padF = filtBus(700, 0.7); s.chords = [[62, 65, 69, 72], [58, 62, 65, 69], [53, 57, 60, 65], [55, 60, 64, 67]]; s.pad = padVoices(s.chords[0], 'triangle', 0.09, s.padF); s.padB = padVoices([38, 45], 'sine', 0.22, A.master); s.dly = mkDelay(0.42, 0.4, 0.35); s.arpF = filtBus(1800, 0.9); s.arpF.disconnect(); s.arpF.connect(s.dly.inp); s.sw = A.ctx.createOscillator(); s.sw.frequency.value = 0.08; s.swg = A.ctx.createGain(); s.swg.gain.value = 0.03; s.sw.connect(s.swg); s.pad.forEach((v) => s.swg.connect(v.g.gain)); s.sw.start(); s.arpI = 0; },
      set(p, t) { const s = st, r = (prm, v) => { prm.cancelScheduledValues(t); prm.setValueAtTime(prm.value, t); prm.linearRampToValueAtTime(v, t + 3); }; r(s.padF.frequency, 700 + 1800 * p); r(s.dly.fbg.gain, 0.4 + 0.25 * p); r(s.arpF.frequency, 1800 + 2200 * p); },
      step(k, t) {
        const s = st, p = s.p, ci = Math.floor(k / 32) % 4, ch = s.chords[ci];
        if (k % 32 === 0) { glideChord(s.pad, ch, t, 1.6); glideChord(s.padB, [ch[0] - 24, ch[0] - 12], t, 1.6); tone('sine', nf(ch[0] - 24), t, 0.05, 1.4, 0.3, A.master); }
        const every = p > 0.55 ? 2 : 4;
        if (k % every === 0) { const seq = ch.concat(ch.map((m) => m + 12)); const m = seq[s.arpI % seq.length]; s.arpI++; tone('sine', nf(m), t, 0.015, 0.5 + 0.4 * p, 0.14 + 0.06 * p, s.arpF); if (p > 0.3) tone('triangle', nf(m + 7), t, 0.02, 0.35, 0.03 + 0.04 * p, s.arpF); }
        if (p > 0.45 && k % 8 === 0) kick(t, 0.12 + 0.25 * (p - 0.45), A.master, 90);
        if (p > 0.7 && k % 4 === 2) noise(t, 0.05, 'highpass', 9000, 1, 0.025 + 0.03 * p, A.master);
      },
    },
    masks: {
      bpm: (p) => 88 + 16 * p, swing: 0.3,
      build() { const s = st; s.padF = filtBus(340, 1); s.chords = [[57, 60, 64], [53, 57, 60], [57, 60, 64], [52, 56, 59]]; s.pad = padVoices(s.chords[0], 'sawtooth', 0.035, s.padF); s.bassF = filtBus(520, 1.5); s.dly = mkDelay(0.5, 0.32, 0.3); s.walk = [45, 48, 52, 50, 45, 43, 40, 43, 41, 45, 48, 47, 44, 47, 52, 50]; s.mel = [69, null, null, 72, null, 76, null, null, 74, null, null, 69, null, null, null, null, 68, null, 71, null, 76, null, null, 74, null, null, 72, null, null, null, null, null]; s.trem = A.ctx.createOscillator(); s.trem.frequency.value = 5; s.tremG = A.ctx.createGain(); s.tremG.gain.value = 0; s.trem.connect(s.tremG); s.trem.start(); },
      set(p, t) { const s = st, r = (prm, v) => { prm.cancelScheduledValues(t); prm.setValueAtTime(prm.value, t); prm.linearRampToValueAtTime(v, t + 2.5); }; r(s.padF.frequency, 340 + 900 * p); r(s.bassF.frequency, 520 + 500 * p); },
      step(k, t) {
        const s = st, p = s.p, ci = Math.floor(k / 32) % 4;
        if (k % 32 === 0) glideChord(s.pad, s.chords[ci], t, 0.8);
        if (k % 4 === 0) tone('triangle', nf(s.walk[Math.floor(k / 4) % 16]), t, 0.005, 0.42, 0.42, s.bassF);
        if (k % 8 === 4) noise(t, 0.11, 'bandpass', 1900, 0.9, 0.07 + 0.09 * p, A.master);
        if (k % 2 === 0) noise(t, 0.03, 'highpass', 6500, 1, 0.022 + 0.03 * p, A.master);
        if (p > 0.15) { const m = s.mel[k % 32]; if (m != null && (p > 0.5 || k % 32 < 16 || Math.floor(k / 32) % 2 === 0)) { const g = A.ctx.createGain(); g.gain.value = 1; s.tremG.connect(g.gain); tone('sine', nf(m), t, 0.008, 1.1, 0.16 + 0.06 * p, s.dly.inp); tone('sine', nf(m + 12), t, 0.008, 0.5, 0.03, s.dly.inp); } }
        if (p > 0.6 && k % 64 === 32) tone('sawtooth', nf(33), t, 0.02, 0.45, 0.22, s.bassF);
        if (p > 0.8 && k % 16 === 14) noise(t, 0.06, 'bandpass', 3000, 2, 0.06, A.master);
      },
    },
  };
  function start(style) {
    if (!A || st) return;
    try {
      const S0 = STYLES[style] || STYLES.ktifa, ctx = A.ctx, now = ctx.currentTime;
      st = { style: S0, p: 0, bpm: S0.bpm(0), next: now + 0.15, step: 0, timer: null, steps: 0 };
      S0.build();
      A.master.gain.cancelScheduledValues(now); A.master.gain.setValueAtTime(0.0001, now); A.master.gain.exponentialRampToValueAtTime(0.5, now + 2.5);
      schedule();
    } catch (e) { st = null; }
  }
  function schedule() {
    if (!st) return;
    const ctx = A.ctx;
    try { while (st.next < ctx.currentTime + 0.4) { const spb = 60 / st.bpm / 4, sw = st.step % 2 ? spb * st.style.swing : 0; st.style.step(st.step, st.next + sw); st.next += spb; st.step++; st.steps++; } } catch (e) { /* */ }
    st.timer = setTimeout(schedule, 90);
  }
  function set(p) { if (!A || !st) return; try { st.p = Math.max(0, Math.min(1, p)); st.bpm = st.style.bpm(st.p); st.style.set(st.p, A.ctx.currentTime); const t = A.ctx.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(Math.max(A.master.gain.value, 0.0001), t); A.master.gain.linearRampToValueAtTime(0.45 + 0.2 * st.p, t + 2.5); } catch (e) { /* */ } }
  function stop() {
    if (!A || !st) return;
    const s = st; st = null; clearTimeout(s.timer);
    try { const t = A.ctx.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(Math.max(A.master.gain.value, 0.0001), t); A.master.gain.exponentialRampToValueAtTime(0.0001, t + 1); } catch (e) { /* */ }
    setTimeout(() => { try { ['pad', 'padB'].forEach((k) => (s[k] || []).forEach((v) => { v.o.stop(); })); ['sw', 'trem'].forEach((k) => { if (s[k]) s[k].stop(); }); } catch (e) { /* */ } }, 1200);
  }
  // ״בום״ קולנועי במעבר, וריזר לפני הסיום
  function boom(strength) {
    if (!A) return;
    try { const ctx = A.ctx, t = ctx.currentTime, s = strength || 1; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140 * s, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.7); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * s, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + 1.7); noise(t, 0.45, 'lowpass', 800, 1, 0.3 * s, A.bus); } catch (e) { /* */ }
  }
  function riser(dur) {
    if (!A) return;
    try { const ctx = A.ctx, t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const n = ctx.createBufferSource(); n.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + dur); g.gain.setValueAtTime(0.0001, t + dur + 0.02); n.connect(f); f.connect(g); g.connect(A.bus); n.start(t); n.stop(t + dur + 0.05); } catch (e) { /* */ }
  }
  function pause(p) { if (!A) return; try { if (p) A.ctx.suspend(); else A.ctx.resume(); } catch (e) { /* */ } }
  window.TeaserAudio = { init, ready, start, set, stop, boom, riser, pause, ctx: () => (A ? A.ctx : null), bus: () => (A ? A.bus : null), stats: () => (st ? { steps: st.steps, bpm: st.bpm, p: st.p } : null) };
})();
