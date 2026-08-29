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

  const { category, question, transcript } = await request.json();
  if (!question || !transcript) {
    return NextResponse.json({ error: "question und transcript sind erforderlich" }, { status: 400 });
  }

  const prompt = `Du bewertest die Antwort eines 14-15 jährigen Bewerbers/einer Bewerberin auf eine Interviewfrage für eine Schweizer Lehrstelle. Sei fair, altersgerecht, konstruktiv und ermutigend, aber ehrlich.

FRAGE (Kategorie: ${CATEGORIES[category] || category}): ${question}

ANTWORT DES BEWERBERS (per Spracheingabe transkribiert, kann leichte Transkriptionsfehler enthalten): "${transcript}"

Bewerte nach diesen gewichteten Kriterien zu einer Gesamtpunktzahl 0-100:
- Inhaltliche Qualität (30%): relevant, vollständig, konkret?
- Struktur (20%): klar gegliedert, roter Faden?
- Beispiele (25%): konkrete, nachvollziehbare Beispiele?
- Selbstreflexion (15%): Selbstbewusstsein und Eigenreflexion?
- Sprachliche Qualität (10%): verständlich, altersgerecht?

Skala: 90-100 hervorragend, 75-89 gut, 50-74 befriedigend, 25-49 schwach, 0-24 unzureichend.

Antworte AUSSCHLIESSLICH mit JSON, keine Einleitung, kein Markdown:
{"score": <ganzzahl 0-100>, "gut": "was war gut, 1-2 Sätze", "nicht_gut": "was war nicht gut, 1-2 Sätze", "verbesserung": "konkreter Verbesserungsvorschlag, 1-2 Sätze", "beispiel": "ein Beispiel für eine bessere, altersgerechte Antwort auf diese Frage, 2-4 Sätze"}`;

  try {
    const raw = await callAnthropic(prompt, 700);
    const parsed = parseJsonSafe(raw);
    if (typeof parsed.score !== "number") throw new Error("Ungültige Antwort vom Modell.");
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
