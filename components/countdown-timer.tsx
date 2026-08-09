"use client";

import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { armFinishCue, playFinishCue } from "@/lib/finish-cue";

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CountdownTimer({
  title,
  subtitle,
  seconds,
  autoStart = false,
  variant = "gym",
  actionLabel,
  onAction,
  onClose,
}: {
  title: string;
  subtitle?: string;
  seconds: number;
  autoStart?: boolean;
  variant?: "gym" | "rest";
  actionLabel?: string;
  onAction?(): void;
  onClose(): void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const cuePlayed = useRef(false);
  const finishAt = useRef(0);

  useEffect(() => {
    if (autoStart) {
      finishAt.current = Date.now() + seconds * 1000;
      void armFinishCue();
    }
  }, [autoStart, seconds]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((finishAt.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) setRunning(false);
    }, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0 || cuePlayed.current) return;
    cuePlayed.current = true;
    void playFinishCue();
  }, [remaining]);

  async function toggle() {
    if (!running) await armFinishCue();
    if (remaining === 0) {
      cuePlayed.current = false;
      setRemaining(seconds);
      finishAt.current = Date.now() + seconds * 1000;
    } else if (!running) {
      finishAt.current = Date.now() + remaining * 1000;
    }
    setRunning((current) => !current);
  }

  function reset() {
    cuePlayed.current = false;
    setRunning(false);
    setRemaining(seconds);
    finishAt.current = Date.now() + seconds * 1000;
  }

  const progress = seconds ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <div className="timer-backdrop">
      <section className={`countdown-card ${variant}`} role="dialog" aria-modal="true" aria-labelledby="timer-title">
        <button className="icon-button timer-close" onClick={onClose} aria-label="Close timer"><X /></button>
        <p className="eyebrow">{variant === "rest" ? "Recovery timer" : "Movement timer"}</p>
        <h2 id="timer-title">{title}</h2>
        {subtitle ? <p className="timer-subtitle">{subtitle}</p> : null}
        <div className="timer-dial" style={{ "--timer-progress": `${progress}%` } as CSSProperties}>
          <div>
            <strong>{clock(remaining)}</strong>
            <span>{remaining === 0 ? "Done — strong finish." : running ? "Keep going" : "Ready"}</span>
          </div>
        </div>
        <button className="primary-button timer-main" onClick={() => void toggle()}>
          {running ? <Pause /> : <Play />}
          {running ? "Pause" : remaining === 0 ? "Run again" : "Start"}
        </button>
        <div className="timer-actions">
          <button className="secondary-button" onClick={reset}><RotateCcw /> Reset</button>
          {actionLabel && onAction ? <button className="secondary-button" onClick={onAction}>{actionLabel}</button> : null}
        </div>
      </section>
    </div>
  );
}
