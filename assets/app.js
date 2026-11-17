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
  const wordsEl = document.getElementById('words');
  const charsEl = document.getElementById('chars');

  const tw = new window.TW.Typewriter();
  const KEY = 'tw-draft-v1';
  const MODE_KEY = 'tw-mode-v1';
  const LINE_WIDTH = 62;

  let typewriterMode = true;
  let bellRung = false;
  let linesBell = 0;

  const stats = { clacks: 0, bells: 0, carriages: 0, keys: 0 };
  window.__tw = { stats, ready: false, audio: null };

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
    document.body.classList.toggle('mode-modern', !on);
    modeBtn.setAttribute('aria-pressed', String(on));
    modeBtn.textContent = on ? 'typewriter' : 'modern';
    if (!quiet) {
      try { localStorage.setItem(MODE_KEY, on ? 'typewriter' : 'modern'); } catch (e) {}
      tw.clack('space');
      say(on ? 'Typewriter mode — clacks, bell, carriage return' : 'Modern mode — silence');
    }
    if (on) keepCaret();
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

  /* ------------------------------------------------------------ key logic */
  function columnOfCaret() {
    const upto = ed.value.slice(0, ed.selectionStart);
    const nl = upto.lastIndexOf('\n');
    return upto.length - (nl + 1);
  }

  ed.addEventListener('keydown', (e) => {
    ensureAudio();
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
    requestAnimationFrame(() => { count(); keepCaret(); });
  });

  // every keystroke that changes the text, including IME and paste
  ed.addEventListener('input', () => {
    count();
    save();
    keepCaret();
  });

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
  window.addEventListener('resize', keepCaret, { passive: true });

  restore();
  setTimeout(() => say('Synthesised in the browser — no audio files. Sound starts on your first key.'), 900);
})();
