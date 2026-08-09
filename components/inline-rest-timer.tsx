"use client";

import { Check, FastForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { playFinishCue } from "@/lib/finish-cue";

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function InlineRestTimer({
  seconds,
  onFinished,
}: {
  seconds: number;
  onFinished(): void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const finishAt = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const cuePlayed = useRef(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    finishAt.current = Date.now() + seconds * 1000;
    intervalRef.current = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((finishAt.current - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (!cuePlayed.current) {
          cuePlayed.current = true;
          void playFinishCue();
          onFinishedRef.current();
        }
      }
    }, 250);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [seconds]);

  function skip() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    cuePlayed.current = true;
    setRemaining(0);
    onFinishedRef.current();
  }

  const progress = seconds ? ((seconds - remaining) / seconds) * 100 : 100;
  return (
    <div className={remaining ? "inline-rest-timer" : "inline-rest-timer done"}>
      <div
        className="inline-rest-progress"
        style={{ "--rest-progress": `${progress}%` } as CSSProperties}
      >
        {remaining ? <strong>{clock(remaining)}</strong> : <Check />}
      </div>
      <div>
        <strong>{remaining ? "Rest after this exercise" : "Rest complete"}</strong>
        <span>
          {remaining
            ? "Review your sets while the timer runs."
            : "Save the review, then continue when ready."}
        </span>
      </div>
      {remaining ? (
        <button className="secondary-button compact" onClick={skip}>
          <FastForward /> Skip rest
        </button>
      ) : null}
    </div>
  );
}
