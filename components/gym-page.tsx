"use client";

import dynamic from "next/dynamic";
import { CalendarDays, Check, Dumbbell, Settings2 } from "lucide-react";
import { useState } from "react";
import { WorkoutRunner } from "@/components/workout-runner";
import type { WorkoutDayData } from "@/lib/types";

const GymPlan = dynamic(
  () => import("@/components/gym-plan").then((module) => module.GymPlan),
  { loading: () => <div className="planner-loading">Opening your week…</div> },
);
const GymHistory = dynamic(
  () => import("@/components/gym-history").then((module) => module.GymHistory),
  { loading: () => <div className="planner-loading">Opening your calendar…</div> },
);

type Tab = "today" | "plan" | "history";

function prettyDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

export function GymPage({
  date,
  initialToday,
  initialTab,
}: {
  date: string;
  initialToday: WorkoutDayData;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [today, setToday] = useState(initialToday);

  async function refreshToday() {
    const response = await fetch(`/api/gym?date=${date}`);
    if (response.ok) setToday(await response.json());
  }

  const heading =
    tab === "today"
      ? "Do today’s plan."
      : tab === "plan"
        ? "Plan the week clearly."
        : "See the work add up.";

  return (
    <section className="section-page gym-page">
      <header className="page-heading simple-heading">
        <div>
          <p className="eyebrow">
            Gym · {tab === "today" ? "Today" : tab === "plan" ? "Weekly plan" : "History"}
          </p>
          <h1>{heading}</h1>
          <p className="muted">
            {tab === "today"
              ? prettyDate(date)
              : tab === "plan"
                ? "Bring an AI-generated JSON plan, then edit every detail."
                : "Fire for training. Moon for recovery."}
          </p>
        </div>
        <span className="heading-mark gym-mark"><Dumbbell /></span>
      </header>

      <div className="section-tabs three" role="tablist" aria-label="Gym views">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")} role="tab" aria-selected={tab === "today"}><Check /> Today</button>
        <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")} role="tab" aria-selected={tab === "plan"}><Settings2 /> Plan</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} role="tab" aria-selected={tab === "history"}><CalendarDays /> History</button>
      </div>

      {tab === "today" ? <WorkoutRunner key={today.day?.id ?? "empty"} data={today} openPlan={() => setTab("plan")} /> : null}
      {tab === "plan" ? <GymPlan today={date} onSaved={refreshToday} /> : null}
      {tab === "history" ? <GymHistory today={date} /> : null}
    </section>
  );
}
