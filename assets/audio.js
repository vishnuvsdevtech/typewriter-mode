/* Synthesised typewriter — no samples, no assets, no network.
 *
 * Every sound is built from an oscillator or a noise buffer, which keeps the
 * repo a few KB and lets each keystroke vary: identical clicks read as a
 * machine gun, and the ear rejects that instantly.
 *
 * Browser autoplay policy: an AudioContext starts suspended and only resumes
 * inside a user gesture, so init() is called from the first keydown/click.
 */
(() => {
  const TW = {};

  class Typewriter {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.enabled = true;
      this.volume = 0.32;
      this.noise = null;
      this.stats = { clacks: 0, bells: 0, carriages: 0 };
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.noise = this._noiseBuffer();
    }

    _noiseBuffer() {
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    _env(node, peak, attack, decay) {
      const t = this.ctx.currentTime;
      const g = node.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(peak, t + attack);
      g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      return t + attack + decay;
    }

    /* The clack: a filtered noise transient (the key) plus a low thump (the
       mechanism). Varying both per stroke is what stops it sounding synthetic. */
    clack(kind = 'key') {
      if (!this.ctx || !this.enabled) return;
      const c = this.ctx;
      const jitter = 0.92 + Math.random() * 0.16;

      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = jitter;

      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = (kind === 'space' ? 900 : 2100) * jitter;
      bp.Q.value = kind === 'space' ? 0.7 : 1.4;

      const g = c.createGain();
      const peak = kind === 'space' ? 0.10 : 0.16 + Math.random() * 0.05;

      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start();
      this._env(g, peak, 0.002, kind === 'space' ? 0.05 : 0.07);
      src.stop(c.currentTime + 0.2);

      // low thump
      const osc = c.createOscillator();
      const og = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = (kind === 'space' ? 90 : 150) * jitter;
      osc.connect(og); og.connect(this.master);
      osc.start();
      this._env(og, 0.07, 0.003, 0.05);
      osc.stop(c.currentTime + 0.15);

      this.stats.clacks++;
    }

    /* Margin bell: two partials, a fifth apart, decaying fast. */
    bell() {
      if (!this.ctx || !this.enabled) return;
      const c = this.ctx;
      [[2093, 0.14], [3136, 0.07]].forEach(([f, amp]) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = f * (0.99 + Math.random() * 0.02);
        osc.connect(g); g.connect(this.master);
        osc.start();
        this._env(g, amp, 0.004, 0.9);
        osc.stop(c.currentTime + 1.1);
      });
      this.stats.bells++;
    }

    /* Carriage return: a noise sweep down, then a mechanical stop. */
    carriage() {
      if (!this.ctx || !this.enabled) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, c.currentTime);
      lp.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.26);
      const g = c.createGain();
      src.connect(lp); lp.connect(g); g.connect(this.master);
      src.start();
      this._env(g, 0.09, 0.01, 0.24);
      src.stop(c.currentTime + 0.35);

      setTimeout(() => this.clack('space'), 250);
      this.stats.carriages++;
    }

    setVolume(v) {
      this.volume = v;
      if (this.master) this.master.gain.value = v;
    }
  }

  TW.Typewriter = Typewriter;
  window.TW = TW;
})();
