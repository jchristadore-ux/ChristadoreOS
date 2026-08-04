let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    try {
      context = new AudioContext();
    } catch {
      return null;
    }
  }
  return context;
}

/**
 * Two short bell-ish tones. Deliberately brief — this is a nudge, not a siren.
 * Browsers gate audio behind a user gesture, so the first tone after a cold
 * load may be silent until the user has interacted with the page.
 */
export function playAlarmTone(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const start = ctx.currentTime;
  for (const [index, frequency] of [880, 1174.7].entries()) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + index * 0.32;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.3);
  }
}
