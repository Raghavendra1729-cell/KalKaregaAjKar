"use client";

import { BellRing, Download, LogOut, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  cue_mode: "vibrate" | "chime" | "beep" | "silent";
  study_reminder_enabled: boolean;
  study_reminder_time: string;
  gym_reminder_enabled: boolean;
  gym_reminder_day: number;
  gym_reminder_time: string;
  timezone: string;
};
type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const defaults: Settings = {
  cue_mode: "vibrate",
  study_reminder_enabled: true,
  study_reminder_time: "21:00",
  gym_reminder_enabled: true,
  gym_reminder_day: 0,
  gym_reminder_time: "18:00",
  timezone: "Asia/Kolkata",
};

function vapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(
    atob((value + padding).replaceAll("-", "+").replaceAll("_", "/")),
    (char) => char.charCodeAt(0),
  );
}

function testCue(mode: Settings["cue_mode"]) {
  if (mode === "vibrate") navigator.vibrate?.([150, 80, 150]);
  if (mode === "silent") return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = mode === "chime" ? 660 : 440;
  gain.gain.value = 0.08;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (mode === "chime" ? 0.35 : 0.16));
}

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(defaults);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        setVapidPublicKey(data.vapid_public_key ?? null);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  async function save() {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setStatus(response.ok ? "Settings saved." : "Could not save settings.");
  }

  async function notifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("Notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notification permission was not granted.");
      return;
    }
    if (!vapidPublicKey) {
      setStatus("Permission enabled. Add VAPID keys for background reminders.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey(vapidPublicKey),
    });
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    setStatus("Background reminders enabled on this device.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Your device</p>
            <h2>Settings</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X />
          </button>
        </div>
        <div className="settings-block">
          <h3>Install and notify</h3>
          <button
            className="secondary-button"
            disabled={!installPrompt}
            onClick={() => installPrompt?.prompt()}
          >
            <Download />{" "}
            {installPrompt ? "Install app" : "Installed or use browser menu"}
          </button>
          <button className="secondary-button" onClick={notifications}>
            <BellRing /> Enable notifications
          </button>
        </div>
        <div className="settings-block">
          <h3>Session cue</h3>
          <div className="segmented">
            {(["vibrate", "chime", "beep", "silent"] as const).map((mode) => (
              <button
                key={mode}
                className={settings.cue_mode === mode ? "active" : ""}
                onClick={() => update("cue_mode", mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => testCue(settings.cue_mode)}
          >
            <Play />
            Test cue
          </button>
        </div>
        <div className="settings-block">
          <h3>Reminders</h3>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.study_reminder_enabled}
              onChange={(event) =>
                update("study_reminder_enabled", event.target.checked)
              }
            />
            <span>Nightly Study plan</span>
            <input
              type="time"
              value={settings.study_reminder_time}
              onChange={(event) =>
                update("study_reminder_time", event.target.value)
              }
            />
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.gym_reminder_enabled}
              onChange={(event) =>
                update("gym_reminder_enabled", event.target.checked)
              }
            />
            <span>Weekly Gym upload</span>
            <input
              type="time"
              value={settings.gym_reminder_time}
              onChange={(event) =>
                update("gym_reminder_time", event.target.value)
              }
            />
          </label>
        </div>
        {status && <p className="status-message">{status}</p>}
        <button className="primary-button" onClick={save}>
          Save settings
        </button>
        <button className="logout-button" onClick={logout}>
          <LogOut />
          Log out
        </button>
      </section>
    </div>
  );
}
