"use client";

import { BellRing, CalendarDays, Download, LogOut, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { armFinishCue, playFinishCue } from "@/lib/finish-cue";

type Settings = {
  study_reminder_enabled: boolean;
  study_reminder_time: string;
  timezone: string;
};

type InstallPrompt = Event & {
  prompt(): Promise<void>;
};

const defaults: Settings = {
  study_reminder_enabled: true,
  study_reminder_time: "07:00",
  timezone: "Asia/Kolkata",
};

function vapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(
    atob((value + padding).replaceAll("-", "+").replaceAll("_", "/")),
    (character) => character.charCodeAt(0),
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const router = useRouter();
  const [settings, setSettings] = useState(defaults);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function saveSettings(next = settings) {
    setBusy(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setStatus(response.ok ? "Morning reminder saved." : "Could not save the reminder.");
      return response.ok;
    } catch {
      setStatus("Could not save the reminder.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notification permission was not granted.");
      return;
    }
    if (!vapidPublicKey) {
      setStatus("Notification keys are not configured yet.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey(vapidPublicKey),
      }));
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) {
      setStatus("Could not enable notifications on this device.");
      return;
    }
    const next = { ...settings, study_reminder_enabled: true };
    setSettings(next);
    if (await saveSettings(next)) {
      setStatus(`Morning reminder enabled for ${next.study_reminder_time}.`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function openWorkoutHistory() {
    onClose();
    router.push("/gym?tab=history");
  }

  async function testWorkoutBell() {
    await armFinishCue();
    await playFinishCue();
    setStatus("Workout bell played. Your device volume controls how loud it is.");
  }

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">One useful nudge</p>
            <h2 id="reminder-title">Morning reminder</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings"><X /></button>
        </div>

        <p className="sheet-intro">A single notification to open Study and write today’s tasks. No gym reminders, streak alerts, or noise.</p>

        <label className="reminder-toggle">
          <input
            type="checkbox"
            checked={settings.study_reminder_enabled}
            onChange={(event) => setSettings((current) => ({ ...current, study_reminder_enabled: event.target.checked }))}
          />
          <span><strong>Remind me each morning</strong><small>Asia/Kolkata</small></span>
          <input
            type="time"
            value={settings.study_reminder_time}
            onChange={(event) => setSettings((current) => ({ ...current, study_reminder_time: event.target.value }))}
            aria-label="Morning reminder time"
          />
        </label>

        <button className="primary-button" disabled={busy} onClick={() => void saveSettings()}>
          {busy ? "Saving…" : "Save reminder"}
        </button>
        <button className="secondary-button sheet-action" onClick={() => void enableNotifications()}>
          <BellRing /> Allow on this device
        </button>
        <button className="secondary-button sheet-action" disabled={!installPrompt} onClick={() => installPrompt?.prompt()}>
          <Download /> {installPrompt ? "Install app" : "Installed or use browser menu"}
        </button>
        <button className="secondary-button sheet-action" onClick={openWorkoutHistory}>
          <CalendarDays /> Open workout history
        </button>
        <button className="secondary-button sheet-action" onClick={() => void testWorkoutBell()}>
          <Volume2 /> Test workout bell
        </button>

        {status ? <p className="status-message" role="status">{status}</p> : null}
        <button className="logout-button" onClick={() => void logout()}><LogOut /> Log out</button>
      </section>
    </div>
  );
}
