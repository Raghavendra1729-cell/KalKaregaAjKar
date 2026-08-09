"use client";

let audioContext: AudioContext | null = null;

function context() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export async function armFinishCue() {
  const audio = context();
  if (audio.state === "suspended") await audio.resume();
}

export async function playFinishCue() {
  try {
    const audio = context();
    if (audio.state === "suspended") await audio.resume();
    const master = audio.createGain();
    master.gain.value = 0.18;
    master.connect(audio.destination);

    for (const offset of [0, 0.28]) {
      for (const [frequency, volume] of [[880, 0.9], [1320, 0.35]] as const) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = frequency === 880 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, audio.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.22);
        oscillator.connect(gain).connect(master);
        oscillator.start(audio.currentTime + offset);
        oscillator.stop(audio.currentTime + offset + 0.24);
      }
    }
    navigator.vibrate?.([110, 55, 110, 55, 190]);
  } catch {
    navigator.vibrate?.([110, 55, 190]);
  }
}
