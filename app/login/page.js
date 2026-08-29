"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "E-Mail oder Passwort ist falsch."
        : error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-wrap">
      <div className="eyebrow">Lehrstellen-Interviewtraining</div>
      <h1 className="mast">Einloggen</h1>
      <form onSubmit={handleSubmit}>
        <label>E-Mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Passwort</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn red" disabled={loading} type="submit" style={{ marginTop: 18 }}>
          {loading ? "Wird geprüft …" : "Einloggen →"}
        </button>
      </form>
      <p className="sub" style={{ marginTop: 20 }}>
        Noch kein Konto? <a href="/signup" style={{ color: "var(--steel)" }}>Jetzt registrieren</a>
      </p>
    </main>
  );
}
