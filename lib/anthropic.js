export function parseJsonSafe(text) {
  let clean = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end >= 0) clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

// Extrahiert das erste "["..."]" JSON-Array aus einer Modellantwort (für Listen-Antworten).
export function parseJsonArraySafe(text) {
  let clean = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start >= 0 && end >= 0) clean = clean.slice(start, end + 1);
  return JSON.parse(clean);
}

async function anthropicMessages(messages, maxTokens) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ist auf dem Server nicht gesetzt.");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens || 700,
      messages,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("\n");
}

export async function callAnthropic(prompt, maxTokens) {
  return anthropicMessages([{ role: "user", content: prompt }], maxTokens);
}

// Schickt ein PDF oder Bild direkt an Claude (Vision/Dokumenten-Unterstützung) und lässt
// den Inhalt als Klartext transkribieren. Für Bewertung/Fragen-Generierung reicht diese
// Textform als Kontext völlig aus, ohne bei jedem weiteren Aufruf erneut das Bild/PDF zu schicken.
export async function extractTextFromFile({ base64, mimeType, fileName }) {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType && mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    throw new Error(`extractTextFromFile: nicht unterstützter Dateityp ${mimeType}`);
  }
  const fileBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: mimeType, data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } };

  const instruction = `Das ist die Datei "${fileName}" (hochgeladen von einem Lernenden als Unterlage für ein Bewerbungs-Interviewtraining). Extrahiere den relevanten Inhalt als gut lesbaren Klartext: bei Zeugnissen die Fächer und Noten, bei Berichten/Schreiben den vollständigen Text, bei Test-Resultaten (Multicheck/Stellwerk) die wichtigsten Ergebnisse/Kompetenzbereiche. Lass Kopf-/Fusszeilen, Layout-Elemente und Wiederholungen weg. Antworte AUSSCHLIESSLICH mit dem extrahierten Klartext, ohne Einleitung oder Kommentar. Maximal ca. 500 Wörter.`;

  return anthropicMessages(
    [{ role: "user", content: [fileBlock, { type: "text", text: instruction }] }],
    1200
  );
}
