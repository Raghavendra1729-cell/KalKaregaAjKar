import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/study");
  return <main className="login-page"><section className="login-card"><div className="brand-mark">K</div><p className="eyebrow">Private space</p><h1>Kal karega?<br/><span>Aaj kar.</span></h1><p className="muted">Your Study and Gym plans, for your eyes only.</p><LoginForm /></section></main>;
}
