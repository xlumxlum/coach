import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/questions";
import { callAnthropic, parseJsonSafe } from "@/lib/anthropic";

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { answers } = await request.json();
  if (!answers || !answers.length) {
    return NextResponse.json({ error: "Keine Antworten übergeben." }, { status: 400 });
  }

  const overall = Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length);
  const catScores = {};
  Object.keys(CATEGORIES).forEach((c) => {
    const list = answers.filter((a) => a.category === c);
    if (list.length) catScores[c] = Math.round(list.reduce((s, a) => s + a.score, 0) / list.length);
  });

  const weakest = answers.filter((a) => a.score < 60).map((a) => `- [${CATEGORIES[a.category]}] "${a.question}" (${a.score} Pkt)`).join("\n") || "Keine.";
  const strongest = answers.filter((a) => a.score >= 80).map((a) => `- [${CATEGORIES[a.category]}] "${a.question}" (${a.score} Pkt)`).join("\n") || "Keine.";

  let overview = { overall_feedback: "", strengths: [], weaknesses: [], recommendations: [] };
  try {
    const prompt = `Erstelle eine kurze, ermutigende, altersgerechte Zusammenfassung für einen 14-15 jährigen Bewerber nach einem Interview-Trainingsdurchgang für eine Schweizer Lehrstelle.

GESAMTPUNKTZAHL: ${overall}/100
PUNKTE PRO KATEGORIE: ${JSON.stringify(catScores)}

SCHWACH BEANTWORTETE FRAGEN (<60 Pkt):
${weakest}

STARK BEANTWORTETE FRAGEN (>=80 Pkt):
${strongest}

Antworte AUSSCHLIESSLICH mit JSON, keine Einleitung, kein Markdown:
{"overall_feedback": "2-3 Sätze Gesamteinschätzung, ermutigend aber ehrlich", "strengths": ["Stärke 1", "..."], "weaknesses": ["Schwäche 1", "..."], "recommendations": ["konkrete Handlungsempfehlung", "..."]}`;
    const raw = await callAnthropic(prompt, 800);
    overview = parseJsonSafe(raw);
  } catch (e) {
    // Nicht fatal: Session wird trotzdem gespeichert, nur ohne Fliesstext-Übersicht.
    overview.overall_feedback = "Automatische Zusammenfassung konnte nicht erstellt werden: " + e.message;
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      overall_score: overall,
      category_scores: catScores,
      overview_feedback: overview.overall_feedback || null,
      strengths: overview.strengths || [],
      weaknesses: overview.weaknesses || [],
      recommendations: overview.recommendations || [],
      status: "done",
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const answerRows = answers.map((a) => ({
    session_id: session.id,
    question_id: a.id,
    question_text: a.question,
    category: a.category,
    transcript: a.transcript,
    score: a.score,
    feedback_good: a.gut,
    feedback_bad: a.nicht_gut,
    feedback_tip: a.verbesserung,
    feedback_example: a.beispiel,
  }));
  const { error: answersError } = await supabase.from("answers").insert(answerRows);
  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });

  await Promise.all(
    answers.map((a) => supabase.rpc("increment_exposure", { p_user_id: user.id, p_question_id: a.id }))
  );

  return NextResponse.json({ sessionId: session.id });
}
