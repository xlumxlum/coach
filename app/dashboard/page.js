import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, created_at, overall_score, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="wrap">
      <div className="topbar">
        <span>{user.email}</span>
        <SignOutButton />
      </div>

      <div className="eyebrow">Lehrstellen-Interviewtraining</div>
      <h1 className="mast">Dein Training</h1>
      <p className="sub">Jede Runde umfasst 25 Fragen aus 8 Kategorien und bevorzugt Fragen, die du noch nicht hattest.</p>

      <a className="btn-primary" href="/interview">Neues Training starten →</a>

      <div className="section-title">Frühere Runden</div>
      {(!sessions || sessions.length === 0) && <p className="sub">Noch keine Runde absolviert.</p>}
      <ul className="session-list">
        {sessions?.map((s) => (
          <li key={s.id}>
            <a href={`/report/${s.id}`}>
              {new Date(s.created_at).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}
              {" — "}
              {s.status === "done" ? `${s.overall_score}/100 Punkte` : "unvollständig"}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
