import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
