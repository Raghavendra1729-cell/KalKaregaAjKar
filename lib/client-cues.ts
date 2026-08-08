export type CueMode = "vibrate" | "chime" | "beep" | "silent";

export async function getCueMode(): Promise<CueMode> {
  try {
    const data = await fetch("/api/settings").then((response) => response.json());
    return data.settings?.cue_mode ?? "vibrate";
  } catch { return "vibrate"; }
}

export function playCue(mode: CueMode) {
  if (mode === "vibrate") { navigator.vibrate?.([160, 80, 160]); return; }
  if (mode === "silent") return;
  const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
  oscillator.type = mode === "chime" ? "sine" : "square"; oscillator.frequency.value = mode === "chime" ? 720 : 440; gain.gain.value = 0.065;
  oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + (mode === "chime" ? 0.4 : 0.14));
}
