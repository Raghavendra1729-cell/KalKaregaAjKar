import type { Metadata } from "next";
import { GymPage } from "@/components/gym-page";
import { getWorkoutDay } from "@/lib/data";
import { isoDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Gym" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const date = isoDate();
  const today = await getWorkoutDay(date);
  const initialTab = tab === "plan" || tab === "history" ? tab : "today";
  return <GymPage date={date} initialToday={today} initialTab={initialTab} />;
}
