"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not log in."); setBusy(false); return; }
    router.push("/study"); router.refresh();
  }
  return <form onSubmit={submit} className="login-form"><label htmlFor="password">App password</label><div className="input-with-icon"><LockKeyhole size={18}/><input id="password" name="password" type="password" autoComplete="current-password" required autoFocus placeholder="Enter your password" /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Opening…" : "Open my plans"}</button></form>;
}
