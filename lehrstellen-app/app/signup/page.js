"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <main className="auth-wrap">
        <div className="eyebrow">Lehrstellen-Interviewtraining</div>
        <h1 className="mast">Fast geschafft</h1>
        <p className="sub">
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Adresse
          und logg dich danach ein.
        </p>
        <a className="btn-primary" href="/login">Zum Login</a>
      </main>
    );
  }

  return (
    <main className="auth-wrap">
      <div className="eyebrow">Lehrstellen-Interviewtraining</div>
      <h1 className="mast">Konto erstellen</h1>
      <form onSubmit={handleSubmit}>
        <label>E-Mail</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Passwort (mind. 6 Zeichen)</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn red" disabled={loading} type="submit" style={{ marginTop: 18 }}>
          {loading ? "Wird erstellt …" : "Registrieren →"}
        </button>
      </form>
      <p className="sub" style={{ marginTop: 20 }}>
        Schon ein Konto? <a href="/login" style={{ color: "var(--steel)" }}>Einloggen</a>
      </p>
    </main>
  );
}
