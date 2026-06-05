function getCtx(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

// ─── Spin sound (~2 seconds rolling ball) ────────────────────────────────────
export function playSpinSound(): Promise<void> {
  return new Promise<void>(resolve => {
    const ctx = getCtx();
    const duration = 2.1;
    const sr = ctx.sampleRate;

    // White noise buffer
    const buf = ctx.createBuffer(1, Math.ceil(sr * duration), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // High-pass filter: simulates ball rattling
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(1800, ctx.currentTime);
    hp.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duration);

    // Gain envelope: starts quiet, swells briefly, then fades
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + duration - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);

    // Ball-drop "click" at the end
    const clickBuf = ctx.createBuffer(1, Math.ceil(sr * 0.04), sr);
    const cd = clickBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length);
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.6;
    clickSrc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickSrc.start(ctx.currentTime + duration - 0.06);

    setTimeout(() => {
      try { ctx.close(); } catch { /* ignore */ }
      resolve();
    }, (duration + 0.15) * 1000);
  });
}

// ─── Correct sound: casino "ching" ascending ─────────────────────────────────
export function playCorrectSound(): void {
  const ctx = getCtx();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.09);
    gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + i * 0.09 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.09);
    osc.stop(ctx.currentTime + i * 0.09 + 0.35);
  });
  setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1500);
}

// ─── Wrong sound: low descending buzz ────────────────────────────────────────
export function playWrongSound(): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.45);
  setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 700);
}
