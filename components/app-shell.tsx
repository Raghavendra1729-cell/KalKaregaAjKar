"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";

const SettingsSheet = dynamic(() => import("@/components/settings-sheet").then((module) => module.SettingsSheet));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js"); }, []);
  return <div className="app-shell"><header className="mobile-header"><div><span className="brand-dot"/>Kal Karega</div><button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Morning reminder"><Bell size={20}/></button></header><aside className="desktop-rail"><div className="desktop-brand"><span className="brand-mark small">K</span><div>Kal Karega<small>Aaj kar.</small></div></div><nav><Link className={pathname.startsWith("/study") ? "active study" : ""} href="/study"><BookOpen/>Study</Link><Link className={pathname.startsWith("/gym") ? "active gym" : ""} href="/gym"><Dumbbell/>Gym</Link></nav><button className="rail-settings" onClick={() => setSettingsOpen(true)}><Bell/>Morning reminder</button></aside><main className="page-canvas">{children}</main><nav className="bottom-nav" aria-label="Primary navigation"><Link className={pathname.startsWith("/study") ? "active study" : ""} href="/study"><BookOpen/><span>Study</span></Link><Link className={pathname.startsWith("/gym") ? "active gym" : ""} href="/gym"><Dumbbell/><span>Gym</span></Link></nav>{settingsOpen ? <SettingsSheet open onClose={() => setSettingsOpen(false)} /> : null}</div>;
}
