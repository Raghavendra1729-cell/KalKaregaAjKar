import type { Metadata } from "next";
import { StudyPage } from "@/components/study-page";

export const metadata: Metadata = { title: "Study" };
export default async function Page({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  return <StudyPage initialTomorrow={day === "tomorrow"} />;
}
