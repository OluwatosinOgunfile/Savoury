let sharedAudioContext: AudioContext | null = null;

export async function primeAlertAudio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return false;
  try {
    sharedAudioContext ||= new AudioContext();
    if (sharedAudioContext.state === "suspended") await sharedAudioContext.resume();
    return sharedAudioContext.state === "running";
  } catch {
    return false;
  }
}

export async function playAlertTone({ volume, frequencies, duration = 0.72 }: { volume: number; frequencies: [number, number]; duration?: number }) {
  const ready = await primeAlertAudio();
  const context = sharedAudioContext;
  if (!ready || !context || context.state !== "running") return false;

  const start = context.currentTime;
  const firstStop = start + duration * 0.39;
  const secondStart = start + duration * 0.43;
  const stop = start + duration * 0.96;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.min(1, Math.max(0.01, volume)), start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(context.destination);

  [
    { frequency: frequencies[0], start, stop: firstStop },
    { frequency: frequencies[1], start: secondStart, stop },
  ].forEach((tone) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, tone.start);
    oscillator.connect(gain);
    oscillator.start(tone.start);
    oscillator.stop(tone.stop);
  });
  return true;
}
