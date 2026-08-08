import type { Metadata } from "next";
import { GymPage } from "@/components/gym-page";

export const metadata: Metadata = { title: "Gym" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tab === "plan" || tab === "history" || tab === "progress" ? tab : "today";
  return <GymPage initialTab={initialTab} />;
}
