"use client";

import { ChevronLeft, ChevronRight, Flame, Moon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { WorkoutHistoryDay } from "@/lib/types";

function moveMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`),
  );
}

export function GymHistory({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [history, setHistory] = useState<WorkoutHistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/gym?month=${month}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load history.");
        if (active) setHistory(data.history ?? []);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [month]);

  const calendar = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const mondayOffset = (first.getUTCDay() + 6) % 7;
    return [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
    ];
  }, [month]);
  const byDate = useMemo(() => new Map(history.map((day) => [day.date, day])), [history]);
  const workoutCount = history.filter((day) => day.day_type === "workout" && day.completed_at).length;
  const restCount = history.filter((day) => day.day_type === "rest").length;

  function changeMonth(amount: number) {
    setLoading(true);
    setError("");
    setMonth((current) => moveMonth(current, amount));
  }

  return (
    <section className="history-card gym-history">
      <div className="history-heading">
        <button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft /></button>
        <div><p className="eyebrow">Workout history</p><h2>{monthLabel(month)}</h2></div>
        <button className="icon-button" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight /></button>
      </div>
      <div className="history-stats">
        <span><Flame /> <strong>{workoutCount}</strong> workouts</span>
        <span><Moon /> <strong>{restCount}</strong> rest days</span>
      </div>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {loading ? <p className="loading-line">Loading calendar…</p> : (
        <>
          <div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="gym-calendar">
            {calendar.map((date, index) => {
              if (!date) return <span className="calendar-blank" key={`blank-${index}`} />;
              const day = byDate.get(date);
              const completeWorkout = day?.day_type === "workout" && day.completed_at;
              const rest = day?.day_type === "rest";
              const className = completeWorkout ? "calendar-day fire" : rest ? "calendar-day rest" : day ? "calendar-day planned" : "calendar-day";
              return (
                <div className={className} key={date} aria-label={`${date}${completeWorkout ? ", workout completed" : rest ? ", rest day" : day ? ", workout planned" : ""}`}>
                  <span>{Number(date.slice(-2))}</span>
                  {completeWorkout ? <Flame /> : rest ? <Moon /> : day ? <i /> : null}
                </div>
              );
            })}
          </div>
          <div className="history-legend"><span><b className="fire" />Completed workout</span><span><b className="rest" />Rest day</span><span><b className="planned" />Planned</span></div>
        </>
      )}
    </section>
  );
}
