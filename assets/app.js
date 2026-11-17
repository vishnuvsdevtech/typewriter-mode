/* Typewriter Mode — the feedback loop, not the feature set.
 *
 * Everything here changes HOW typing feels: an audible clack per key with
 * per-stroke variance, a bell at the margin, a carriage return on Enter, and a
 * caret held in the lower-middle band so your eye stops chasing the bottom of
 * the page. The editor is still a textarea.
 */
(() => {
  const ed = document.getElementById('editor');
  const sheet = document.getElementById('sheet');
  const modeBtn = document.getElementById('modeBtn');
  const soundBtn = document.getElementById('soundBtn');
  const note = document.getElementById('note');
  const carriage = document.getElementById('carriage');
  const glow = document.getElementById('glow');
  const cone = document.getElementById('cone');
  const platenEl = document.querySelector('.platen');
  const paper = document.getElementById('paper');
  let probeCtx = null;
  const wordsEl = document.getElementById('words');
  const charsEl = document.getElementById('chars');

  const tw = new window.TW.Typewriter();
  const KEY = 'tw-draft-v1';
  const MODE_KEY = 'tw-mode-v1';
  let LINE_WIDTH = 62;   // recomputed to the real column capacity on load/resize

  let typewriterMode = true;
  let bellRung = false;
  let linesBell = 0;

  const stats = { clacks: 0, bells: 0, carriages: 0, keys: 0 };
  window.__tw = { stats, ready: false, audio: null, capacity: () => LINE_WIDTH };

  /* ---------------------------------------------------------------- toast */
  let noteTimer = 0;
  function say(msg) {
    note.textContent = msg;
    note.classList.add('show');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => note.classList.remove('show'), 3200);
  }

  /* ----------------------------------------------------------------- boot */
  function restore() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) ed.value = saved;
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'modern') setMode(false, true);
    } catch (e) {}
    count();
  }

  function setMode(on, quiet) {
    typewriterMode = on;
    if (!on) { glow.classList.remove('on'); cone.classList.remove('on'); lightOn = false; }
    document.body.classList.toggle('mode-modern', !on);
    modeBtn.setAttribute('aria-pressed', String(on));
    modeBtn.textContent = on ? 'typewriter' : 'modern';
    if (!quiet) {
      try { localStorage.setItem(MODE_KEY, on ? 'typewriter' : 'modern'); } catch (e) {}
      tw.clack('space');
      say(on ? 'Typewriter mode — clacks, bell, carriage return' : 'Modern mode — silence');
    }
    if (on) { keepCaret(); updateLight(); }
  }

  /* A typewriter bell warns before the margin, so the threshold has to be the
     REAL column capacity of this sheet at this font size — a hardcoded 62 rang
     after the visual line had already wrapped. */
  function measureCapacity() {
    const cs = getComputedStyle(ed);
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = `${cs.fontSize} ${cs.fontFamily}`;
    const charW = probe.measureText('M').width || parseFloat(cs.fontSize) * 0.6;
    const usable = ed.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    LINE_WIDTH = Math.max(24, Math.floor(usable / charW) - 2);
    return LINE_WIDTH;
  }

  function count() {
    const v = ed.value;
    const w = v.trim() ? v.trim().split(/\s+/).length : 0;
    wordsEl.textContent = w;
    charsEl.textContent = v.length;
  }

  function save() {
    try { localStorage.setItem(KEY, ed.value); } catch (e) {}
  }

  /* --------------------------------------------------------------- sound */
  function ensureAudio() {
    if (window.__tw.ready) return;
    tw.init();
    window.__tw.ready = !!tw.ctx;
    window.__tw.audio = tw.ctx ? tw.ctx.state : 'unavailable';
    if (!tw.ctx) say('This browser has no Web Audio — the mode still works, silently.');
  }

  /* ----------------------------------------------------------- caret band */
  function caretVisualY() {
    const cs = getComputedStyle(ed);
    const lh = parseFloat(cs.lineHeight) || 28;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const charW = ed.clientWidth / Math.max(1, Math.floor(ed.clientWidth / (parseFloat(cs.fontSize) * 0.6)));
    const perLine = Math.max(8, Math.floor((ed.clientWidth - 4) / (charW || 8)));
    const before = ed.value.slice(0, ed.selectionStart);
    let lines = 0;
    before.split('\n').forEach((seg) => { lines += Math.max(1, Math.ceil(seg.length / perLine)); });
    return padTop + (lines - 1) * lh;
  }

  function keepCaret() {
    if (!typewriterMode) return;
    const y = caretVisualY();
    const target = y - ed.clientHeight * 0.45;
    ed.scrollTop = Math.max(0, Math.min(target, ed.scrollHeight - ed.clientHeight));
  }

  /* ------------------------------------------------- carriage + light rig
   * The carriage rides the column, the lamp throws a cone up onto the active
   * line. Position is derived from the caret, not from the scroll container, so
   * it stays correct while the text scrolls under the platen.
   */
  function charWidth() {
    const cs = getComputedStyle(ed);
    if (!probeCtx) probeCtx = document.createElement('canvas').getContext('2d');
    probeCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
    return probeCtx.measureText('M').width || parseFloat(cs.fontSize) * 0.6;
  }

  function caretMetrics() {
    const cs = getComputedStyle(ed);
    const lh = parseFloat(cs.lineHeight) || 30;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const cw = charWidth();
    const before = ed.value.slice(0, ed.selectionStart);
    const nl = before.lastIndexOf('\n');
    const col = before.length - (nl + 1);
    const lineIdx = (before.match(/\n/g) || []).length;
    const maxX = ed.clientWidth - (parseFloat(cs.paddingRight) || 0) - cw;
    return {
      x: Math.min(padL + col * cw, maxX),
      y: padT + lineIdx * lh - ed.scrollTop,
      lh,
    };
  }

  let lightOn = false;

  function updateLight() {
    if (!typewriterMode) {
      glow.classList.remove('on'); cone.classList.remove('on');
      return;
    }
    const m = caretMetrics();
    // carriage rides the platen rail, inset by the roller's margin
    carriage.style.transform = `translateX(${m.x - 13}px)`;
    // the pool of light sits on the line being typed
    glow.style.left = m.x + 'px';
    glow.style.top = m.y + 'px';

    // the cone starts at the carriage and opens up to that line
    const platenTop = platenEl ? platenEl.offsetTop : ed.offsetTop + ed.clientHeight;
    const top = Math.max(0, m.y + m.lh * 0.4);
    const h = Math.max(0, platenTop - top + 6);
    cone.style.left = m.x + 'px';
    cone.style.top = top + 'px';
    cone.style.height = h + 'px';

    if (!lightOn && (ed.value.length || document.activeElement === ed)) {
      glow.classList.add('on'); cone.classList.add('on');
      lightOn = true;
    }
  }

  function feedPaper() {
    if (!typewriterMode) return;
    paper.classList.remove('feed');
    void paper.offsetWidth;          // restart the animation
    paper.classList.add('feed');
  }

  /* ------------------------------------------------------------ key logic */
  function columnOfCaret() {
    const upto = ed.value.slice(0, ed.selectionStart);
    const nl = upto.lastIndexOf('\n');
    return upto.length - (nl + 1);
  }

  ed.addEventListener('keydown', (e) => {
    ensureAudio();
    if (e.key === 'Enter') {
      carriage.classList.add('returning');       // the carriage slams back
      setTimeout(() => carriage.classList.remove('returning'), 320);
      feedPaper();
    } else {
      carriage.classList.remove('returning');
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === 's') { e.preventDefault(); exportTxt(); return; }
      return;
    }

    const printable = e.key.length === 1;
    stats.keys++;

    if (typewriterMode) {
      if (e.key === 'Enter') {
        tw.carriage();
        stats.carriages++;
        bellRung = false;
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        tw.clack('space');
        stats.clacks++;
      } else if (e.key === ' ') {
        tw.clack('space');
        stats.clacks++;
        const col = columnOfCaret();
        if (!bellRung && col >= LINE_WIDTH) { tw.bell(); stats.bells++; bellRung = true; }
      } else if (printable) {
        tw.clack('key');
        stats.clacks++;
      }
    }
    requestAnimationFrame(() => { count(); keepCaret(); updateLight(); });
  });

  // every keystroke that changes the text, including IME and paste
  ed.addEventListener('input', () => {
    count();
    save();
    keepCaret();
    updateLight();
  });
  ed.addEventListener('scroll', updateLight, { passive: true });
  ed.addEventListener('focus', updateLight);
  ed.addEventListener('keyup', updateLight);

  /* --------------------------------------------------------------- export */
  function exportTxt() {
    const blob = new Blob([ed.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manuscript.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    say('Saved manuscript.txt');
  }

  /* ------------------------------------------------------------- controls */
  modeBtn.addEventListener('click', () => { ensureAudio(); setMode(!typewriterMode); });
  soundBtn.addEventListener('click', () => {
    ensureAudio();
    tw.enabled = !tw.enabled;
    soundBtn.setAttribute('aria-pressed', String(tw.enabled));
    soundBtn.textContent = tw.enabled ? 'sound on' : 'sound off';
    if (tw.enabled) tw.clack('space');
  });

  document.addEventListener('pointerdown', ensureAudio, { once: true });

  ed.addEventListener('click', keepCaret);
  window.addEventListener('resize', () => { keepCaret(); measureCapacity(); }, { passive: true });

  restore();
  measureCapacity();
  updateLight();
  setTimeout(() => say('Synthesised in the browser — no audio files. Sound starts on your first key.'), 900);
})();
