function getCtx(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

// ─── Spin sound (real roulette wheel audio) ───────────────────────────────────
export function playSpinSound(): Promise<void> {
  return new Promise<void>(resolve => {
    const audio = new Audio(import.meta.env.BASE_URL + "spin.mp4");
    audio.volume = 1.0;
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", () => resolve());
    audio.play().catch(() => resolve());
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
