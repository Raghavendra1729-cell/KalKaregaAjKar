import type { Metadata } from "next";
import { StudyPage } from "@/components/study-page";
import { getStudyGroups, getStudyTasks } from "@/lib/data";
import { isIsoDate, isoDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Study" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: requestedDate } = await searchParams;
  const today = isoDate();
  const date = requestedDate && isIsoDate(requestedDate) ? requestedDate : today;
  const [tasks, groups] = await Promise.all([
    getStudyTasks(date),
    getStudyGroups(),
  ]);
  return (
    <StudyPage
      today={today}
      initialDate={date}
      initialTasks={tasks}
      initialGroups={groups}
    />
  );
}
