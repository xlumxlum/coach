// Fragenpool: 100 Basisfragen in 8 Kompetenzkategorien.

import { callAnthropic, parseJsonArraySafe } from "./anthropic";
import { buildDocumentContext } from "./documents";

export const CATEGORIES = {
  person: "Person",
  staerken: "Stärken & Schwächen",
  berufswahl: "Berufswahl & Motivation",
  erfahrung: "Erfahrung & Praxis",
  team: "Teamfähigkeit & Arbeitsweise",
  ziele: "Ziele",
  verhalten: "Verhaltensfragen",
  kreativ: "Kreativität & Spontanität",
};

export const SESSION_LENGTH = 25;

// Wie viele neue Varianten-Fragen pro Kategorie generiert werden, sobald der
// Basis-Fragenpool dieser Kategorie für einen Nutzer komplett durchgespielt ist.
const VARIETY_BATCH_SIZE = 4;
// Maximale Anzahl dokumentbasierter, persönlicher Fragen pro Session.
const MAX_DOCUMENT_QUESTIONS = 4;

const RAW = [
  ["person", "Stell dich kurz vor. Was müssen wir über dich wissen?"],
  ["person", "Was machen deine Eltern? Hast du Geschwister?"],
  ["person", "Was machst du in deiner Freizeit? Welche Hobbys hast du?"],
  ["person", "Wie erlebst du die Schule? Welches sind deine Lieblingsfächer?"],
  ["person", "Welche Fächer magst du nicht so gerne? Warum?"],
  ["person", "Wie gerne machst du Hausaufgaben?"],
  ["person", "Wie bereitest du dich auf Prüfungen vor?"],
  ["person", "Wie kommt eine bestimmte Note in einem Fach in deinem Zeugnis zustande?"],
  ["person", "Wie würden deine Freunde dich beschreiben?"],
  ["person", "Wenn du dich mit einem Wort beschreiben müsstest – welches wäre das?"],
  ["staerken", "Was sind deine Stärken? Nenne 2–3 und belege sie mit Beispielen."],
  ["staerken", "Was sind deine Schwächen? Nenne eine echte Schwäche und zeig, wie du daran arbeitest."],
  ["staerken", "Wie gehst du mit deinen Schwächen um?"],
  ["staerken", "Wurden deine Schwächen dir schon einmal zum Hindernis?"],
  ["staerken", "Wie würdest du deine Stärken in die Ausbildung einbringen?"],
  ["staerken", "Was war bisher dein grösster Fehler und wie bist du damit umgegangen?"],
  ["staerken", "Was war bisher deine grösste Herausforderung?"],
  ["staerken", "Was motiviert dich, dein Bestes zu geben?"],
  ["staerken", "Was macht dich deiner Meinung nach einzigartig?"],
  ["staerken", "Wie definierst und misst du Erfolg?"],
  ["staerken", "Was denkst du, was andere an dir schätzen?"],
  ["staerken", "Wie gehst du mit Rückschlägen um?"],
  ["berufswahl", "Warum möchtest du genau diesen Beruf lernen?"],
  ["berufswahl", "Warum hast du dich bei unserem Unternehmen beworben?"],
  ["berufswahl", "Was weisst du über unser Unternehmen?"],
  ["berufswahl", "Was kennst du von dieser Branche?"],
  ["berufswahl", "Kennst du unsere grössten Konkurrenten?"],
  ["berufswahl", "Was reizt dich an dieser Lehrstelle?"],
  ["berufswahl", "Was erwartest du von dieser Lehrstelle?"],
  ["berufswahl", "Warum sollen wir dich einstellen?"],
  ["berufswahl", "Was könntest du zu diesem Unternehmen beitragen?"],
  ["berufswahl", "Hast du dich noch an anderen Orten beworben?"],
  ["berufswahl", "Was hat dich dazu bewogen, diesen Beruf zu wählen und nicht einen ähnlichen?"],
  ["berufswahl", "Was ist für dich der grösste Vorteil dieses Berufes?"],
  ["berufswahl", "Gibt es Aspekte in diesem Beruf, die dir weniger zusagen?"],
  ["erfahrung", "Hast du Schnupperlehren gemacht? Wie hast du sie erlebt?"],
  ["erfahrung", "Was hat dir in der Schnupperlehre gefallen? Was nicht?"],
  ["erfahrung", "Was hast du bei der Schnupperlehre oder im Praktikum gelernt? Mit Beispielen!"],
  ["erfahrung", "Hast du neben der Schule oder in den Ferien gearbeitet?"],
  ["erfahrung", "Erfüllst du die persönlichen Voraussetzungen für diesen Beruf, z. B. genaues Arbeiten oder Einfühlungsvermögen?"],
  ["erfahrung", "Welche Erfahrungen hast du, die dich für diese Lehrstelle qualifizieren?"],
  ["erfahrung", "Was sind deine bisherigen technischen Fähigkeiten oder Kenntnisse?"],
  ["erfahrung", "Hast du Erfahrung mit bestimmten Softwareprogrammen oder Werkzeugen?"],
  ["erfahrung", "Kannst du ein technisches Problem beschreiben, das du erfolgreich gelöst hast?"],
  ["erfahrung", "Wie gehst du mit neuen technischen Herausforderungen um?"],
  ["erfahrung", "Hast du schon einmal einen Einblick in einen Betrieb bekommen, z. B. durch Eltern, Bekannte oder einen Tag der offenen Tür? Was hast du gesehen?"],
  ["erfahrung", "Gibt es ein Erlebnis in der Schnupperlehre, das dich besonders geprägt hat?"],
  ["erfahrung", "Was war für dich der wertvollste Moment während der Schnupperlehre?"],
  ["erfahrung", "Du schreibst, dass du bei einem Projekt geholfen hast. Kannst du mir das genauer erklären?"],
  ["erfahrung", "Aus welchen Gründen hast du eine Klasse wiederholt?"],
  ["erfahrung", "Welchen Tätigkeiten bist du bei deinem Praktikum nachgegangen?"],
  ["erfahrung", "Sprichst du fliessend eine Fremdsprache?"],
  ["erfahrung", "Warum hast du bisher kein Praktikum gemacht?"],
  ["team", "Kannst du unter Druck arbeiten?"],
  ["team", "Kannst du im Team arbeiten?"],
  ["team", "Wie verhältst du dich in einer Gruppe? Welchen Platz nimmst du ein?"],
  ["team", "Wie reagierst du bei Konflikten in der Schule, zu Hause oder in der Freizeit?"],
  ["team", "Welche Charakterzüge regen dich am meisten auf?"],
  ["team", "Wie gehst du mit neuen Herausforderungen um?"],
  ["team", "Wie organisierst du deine Zeit und Prioritäten?"],
  ["team", "Wie triffst du Entscheidungen?"],
  ["team", "Wie gehst du mit Kritik um?"],
  ["team", "Was ist dir an Arbeitskollegen wichtig?"],
  ["team", "Wie gehst du mit Langeweile oder monotoner Arbeit um?"],
  ["team", "Wie bleibst du während längerer Arbeitszeiten konzentriert?"],
  ["team", "Kannst du ein Beispiel nennen, wo du im Team besonders gut zusammengearbeitet hast?"],
  ["team", "Wie gehst du damit um, wenn du mit einem Arbeitskollegen oder Mitschüler nicht einer Meinung bist?"],
  ["ziele", "Wo siehst du dich in fünf Jahren?"],
  ["ziele", "Wo siehst du dich nach der Lehre? Berufsmatur, Weiterbildung oder im Betrieb bleiben?"],
  ["ziele", "Was sind deine beruflichen Ziele?"],
  ["ziele", "Wie passt diese Stelle zu deiner Karriereplanung?"],
  ["ziele", "Warum möchtest du nicht studieren?"],
  ["ziele", "Welche Weiterbildungen könntest du dir nach der Lehre vorstellen?"],
  ["verhalten", "Erzähl von einer Situation, in der du Führungsqualitäten gezeigt hast."],
  ["verhalten", "Erzähl von einer Situation, in der du besonders viel zu tun hattest – wie bist du damit umgegangen?"],
  ["verhalten", "Beschreib eine Herausforderung oder einen Konflikt bei der Arbeit oder in der Schule und wie du damit umgegangen bist."],
  ["verhalten", "Hast du schon einmal eine Richtlinie nicht befolgt, mit der du nicht einverstanden warst?"],
  ["verhalten", "Wie gehst du mit Kritik an deiner Arbeit um?"],
  ["verhalten", "Erzähl mir von einem Projekt, an dem du gearbeitet hast."],
  ["verhalten", "Arbeitest du lieber selbstständig oder im Team?"],
  ["verhalten", "Wie verhältst du dich, wenn du in deiner Arbeit auf ein Problem stösst, das du nicht lösen kannst?"],
  ["verhalten", "Du kannst ein Projekt rechtzeitig und unvollständig oder vollständig und verspätet abschliessen. Wofür entscheidest du dich?"],
  ["verhalten", "Wie würdest du einem Nicht-Experten ein komplexes Thema erklären?"],
  ["verhalten", "Erzähl von einer Situation, in der du Verantwortung übernommen hast."],
  ["verhalten", "Wie gehst du vor, wenn du eine neue Aufgabe bekommst, die du noch nie gemacht hast?"],
  ["verhalten", "Erzähl von einer Situation, in der du andere motivieren konntest."],
  ["kreativ", "Wenn du ein Tier wärst, welches wäre das und warum?"],
  ["kreativ", "Was wäre der Titel deiner Autobiografie?"],
  ["kreativ", "Was ist das Verrückteste, das du jemals gemacht hast?"],
  ["kreativ", "Mit welchen Spielzeugen hast du als Kind gespielt?"],
  ["kreativ", "Was wäre ein Grund, aus dem wir dich nicht nehmen sollten?"],
  ["kreativ", "Was würdest du tun, wenn du vor dem Kino versetzt wirst, aber schon die Tickets gekauft hast?"],
  ["kreativ", "Wie kannst du bei geschlossener Tür testen, ob ein automatisches Licht im Bad tatsächlich ausgeht?"],
  ["kreativ", "Was würdest du einem jüngeren Freund oder Geschwisterkind raten, das bald auch eine Lehre beginnen möchte?"],
  ["kreativ", "Was ist wichtiger: Dissens oder Konsens?"],
  ["kreativ", "Wie viele Smarties passen in einen Smart?"],
  ["kreativ", "Wie schwer ist New York?"],
  ["kreativ", "Wie viel Grad liegen zwischen dem Minuten- und Stundenzeiger, wenn es 15:15 Uhr ist?"],
  ["kreativ", "Wie wahrscheinlich ist es, dass die Menschheit auf ausserirdisches Leben stösst?"],
  ["kreativ", "Wie viele Schmuckstücke liegen wohl am Strand von Nizza vergraben?"],
];

export const QUESTION_BANK = RAW.map((r, i) => ({
  id: "q" + (i + 1),
  cat: r[0],
  text: r[1],
}));

// Lässt Claude neue Fragen für eine Kategorie erfinden, die inhaltlich auf dasselbe
// abzielen wie die bestehenden Fragen dieser Kategorie, aber anders formuliert sind.
async function generateVarietyQuestions(categoryKey, existingTexts, count = VARIETY_BATCH_SIZE) {
  const prompt = `Du erstellst neue Interviewfragen für ein Bewerbungs-Interviewtraining für 14–15-jährige Lehrstellen-Bewerber/innen in der Schweiz.

KATEGORIE: ${CATEGORIES[categoryKey]}

Das sind bereits bestehende Fragen dieser Kategorie (NICHT wiederholen):
${existingTexts.map((t) => "- " + t).join("\n")}

Erstelle ${count} NEUE, altersgerechte Interviewfragen für dieselbe Kategorie "${CATEGORIES[categoryKey]}". Sie sollen inhaltlich auf ähnliche Kompetenzen/Themen abzielen wie die bestehenden Fragen dieser Kategorie, aber anders formuliert bzw. aus einem anderen Blickwinkel gestellt sein – keine blosse Umformulierung einer einzelnen bestehenden Frage. Kurz, klar, direkt, wie in einem echten Bewerbungsgespräch.

Antworte AUSSCHLIESSLICH mit einem JSON-Array aus ${count} Strings, kein Markdown, keine Einleitung:
["Frage 1", "Frage 2", ...]`;

  const raw = await callAnthropic(prompt, 600);
  const arr = parseJsonArraySafe(raw);
  return arr.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, count);
}

// Lässt Claude persönliche Fragen aus den hochgeladenen Unterlagen ableiten.
// Fragt NUR zu Themen, zu denen tatsächlich eine Unterlage vorliegt.
async function generateDocumentQuestions(documentContext, count = MAX_DOCUMENT_QUESTIONS) {
  const catList = Object.entries(CATEGORIES).map(([k, v]) => `${k} = ${v}`).join(", ");
  const prompt = `Du erstellst Interviewfragen für ein Bewerbungs-Interviewtraining für einen 14–15-jährigen Lehrstellenbewerber in der Schweiz – basierend auf seinen tatsächlich hochgeladenen Unterlagen.

VERFÜGBARE KATEGORIE-KEYS: ${catList}

HOCHGELADENE UNTERLAGEN:
${documentContext}

Erstelle bis zu ${count} konkrete, persönliche Interviewfragen, die sich DIREKT auf den Inhalt dieser Unterlagen beziehen (z. B. konkrete Noten/Fächer aus dem Zeugnis, den Firmennamen bzw. die Stelle aus Stellenausschreibung/-beschrieb, konkrete Aussagen aus dem Motivationsschreiben, konkrete Erlebnisse aus dem Schnupperbericht, konkrete Resultate aus Multicheck/Stellwerktest). Stelle NUR Fragen zu Themen, zu denen oben tatsächlich eine Unterlage vorliegt – erfinde nichts zu Themen ohne Unterlage (z. B. keine Schnupperlehre-Frage, wenn kein Schnupperbericht vorhanden ist).

Antworte AUSSCHLIESSLICH mit einem JSON-Array von Objekten, kein Markdown, keine Einleitung:
[{"category": "<einer der Kategorie-Keys oben>", "question": "..."}]`;

  const raw = await callAnthropic(prompt, 900);
  const arr = parseJsonArraySafe(raw);
  return arr
    .filter((o) => o && typeof o.question === "string" && o.question.trim() && CATEGORIES[o.category])
    .map((o) => ({ category: o.category, question: o.question.trim() }))
    .slice(0, count);
}

// Wählt SESSION_LENGTH Fragen aus, verteilt über alle Kategorien, bevorzugt pro Nutzer
// noch nicht (oder seltener) gestellte Fragen. Ist der fest hinterlegte Basispool einer
// Kategorie komplett durchgespielt, werden per Claude neue Varianten-Fragen generiert und
// dauerhaft für den Nutzer gespeichert (generated_questions). Zusätzlich werden – falls
// Unterlagen hochgeladen wurden – ein paar Fragen durch persönliche, dokumentbasierte
// Fragen ersetzt.
export async function buildSessionQuestions(supabase, userId) {
  const [{ data: exposure }, { data: genRows }, { data: docs }] = await Promise.all([
    supabase.from("question_exposure").select("question_id, times_asked").eq("user_id", userId),
    supabase.from("generated_questions").select("id, category, question_text").eq("user_id", userId),
    supabase.from("documents").select("doc_type, file_name, extracted_text").eq("user_id", userId),
  ]);

  const counts = {};
  (exposure || []).forEach((e) => {
    counts[e.question_id] = e.times_asked;
  });

  let generated = (genRows || []).map((r) => ({ id: "g" + r.id, cat: r.category, text: r.question_text }));

  const catKeys = Object.keys(CATEGORIES);
  const perCat = Math.floor(SESSION_LENGTH / catKeys.length);
  let remainder = SESSION_LENGTH - perCat * catKeys.length;
  const catNeeds = {};
  catKeys.forEach((cat) => {
    catNeeds[cat] = perCat + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  });

  // Kategorien, deren gesamter Pool (Basis + bisher generierte Varianten) bereits
  // vollständig mindestens 1x gestellt wurde.
  const exhaustedCats = catKeys.filter((cat) => {
    const pool = [...QUESTION_BANK.filter((q) => q.cat === cat), ...generated.filter((q) => q.cat === cat)];
    return pool.length > 0 && pool.every((q) => (counts[q.id] || 0) > 0);
  });

  if (exhaustedCats.length) {
    const results = await Promise.all(
      exhaustedCats.map(async (cat) => {
        const existingTexts = [...QUESTION_BANK.filter((q) => q.cat === cat), ...generated.filter((q) => q.cat === cat)].map(
          (q) => q.text
        );
        try {
          const texts = await generateVarietyQuestions(cat, existingTexts);
          return { cat, texts };
        } catch (e) {
          return { cat, texts: [] };
        }
      })
    );
    const toInsert = [];
    results.forEach(({ cat, texts }) => texts.forEach((text) => toInsert.push({ user_id: userId, category: cat, question_text: text })));
    if (toInsert.length) {
      const { data: inserted } = await supabase.from("generated_questions").insert(toInsert).select();
      const fresh = (inserted || []).map((r) => ({ id: "g" + r.id, cat: r.category, text: r.question_text }));
      generated = [...generated, ...fresh];
    }
  }

  const selected = [];
  catKeys.forEach((cat) => {
    const need = catNeeds[cat];
    const pool = [...QUESTION_BANK.filter((q) => q.cat === cat), ...generated.filter((q) => q.cat === cat)].map((q) => ({
      q,
      count: counts[q.id] || 0,
      r: Math.random(),
    }));
    pool.sort((a, b) => a.count - b.count || a.r - b.r);
    selected.push(...pool.slice(0, need).map((p) => p.q));
  });

  // Dokumentbasierte, persönliche Fragen einstreuen (nur falls Unterlagen vorhanden).
  const docContext = buildDocumentContext(docs);
  if (docContext) {
    try {
      const docQs = await generateDocumentQuestions(docContext);
      const usedIdx = new Set();
      docQs.forEach((dq) => {
        let replaceIdx = -1;
        for (let i = selected.length - 1; i >= 0; i--) {
          if (selected[i].cat === dq.category && !usedIdx.has(i)) {
            replaceIdx = i;
            break;
          }
        }
        if (replaceIdx >= 0) {
          usedIdx.add(replaceIdx);
          selected[replaceIdx] = {
            id: "doc" + Math.random().toString(36).slice(2, 10),
            cat: dq.category,
            text: dq.question,
          };
        }
      });
    } catch (e) {
      // Dokumentbasierte Fragen sind ein Bonus – bei Fehler läuft die Session ganz normal weiter.
    }
  }

  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  return selected.slice(0, SESSION_LENGTH);
}
