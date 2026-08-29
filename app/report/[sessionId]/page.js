import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/questions";

function scoreClass(s) {
  if (s >= 90) return "score-90";
  if (s >= 75) return "score-75";
  if (s >= 50) return "score-50";
  if (s >= 25) return "score-25";
  return "score-0";
}

export default async function ReportPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) notFound();

  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const catScores = session.category_scores || {};
  const catKeys = Object.keys(CATEGORIES).filter((c) => catScores[c] !== undefined);

  return (
    <main className="wrap">
      <div className="topbar">
        <a href="/dashboard" style={{ color: "var(--grey)" }}>← Zurück zum Dashboard</a>
      </div>

      <div className="eyebrow">Auswertung</div>
      <h1 className="mast">Dein Report</h1>

      <div className="big-score-wrap">
        <div className="big-score">{session.overall_score}</div>
        <div className="big-score-label">/ 100 Punkte gesamt</div>
      </div>
      {session.overview_feedback && <p className="sub">{session.overview_feedback}</p>}

      <div className="section-title">Punkte pro Kategorie</div>
      {catKeys.map((c) => (
        <div className="bar-row" key={c}>
          <div className="bar-cat">{CATEGORIES[c]}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: catScores[c] + "%" }} />
          </div>
          <div className="bar-val">{catScores[c]}</div>
        </div>
      ))}

      {session.strengths?.length > 0 && (
        <>
          <div className="section-title">Stärken</div>
          <ul className="strengths-list">
            {session.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}

      {session.weaknesses?.length > 0 && (
        <>
          <div className="section-title">Woran du arbeiten kannst</div>
          <ul className="strengths-list">
            {session.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}

      {session.recommendations?.length > 0 && (
        <>
          <div className="section-title">Empfehlungen für die nächste Runde</div>
          <ul className="recs-list">
            {session.recommendations.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}

      <div className="section-title">Alle Fragen im Detail</div>
      {answers?.map((a, i) => (
        <div className="qa-item" key={a.id}>
          <div className="qa-q">
            {i + 1}. {a.question_text} <span className={"score-pill " + scoreClass(a.score)}>{a.score}/100</span>
          </div>
          <div className="qa-a">„{a.transcript}"</div>
          <div className="qa-fb">
            <div className="row"><b>Gut:</b> {a.feedback_good}</div>
            <div className="row"><b>Verbesserungspotenzial:</b> {a.feedback_bad}</div>
            <div className="row"><b>Tipp:</b> {a.feedback_tip}</div>
            <div className="row"><b>Beispiel einer stärkeren Antwort:</b> {a.feedback_example}</div>
          </div>
        </div>
      ))}

      <div className="controls-row" style={{ marginTop: 30 }}>
        <a className="btn-primary" href="/interview">Neue Trainingsrunde →</a>
      </div>
    </main>
  );
}
