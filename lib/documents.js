// Dokumenttypen, die Lernende optional hochladen können.
// multi:true  -> mehrere Dateien bleiben nebeneinander erhalten (z.B. mehrere Schnupperberichte über die Zeit)
// multi:false -> ein neuer Upload ersetzt die vorher hochgeladene Datei dieses Typs
//                (diese Dokumente betreffen jeweils EINE konkrete Bewerbung)

export const DOC_TYPES = {
  zeugnis: { label: "Zeugnis", multi: true, hint: "Schulzeugnis(se)" },
  multicheck: { label: "Multicheck", multi: true, hint: "Multicheck-Ergebnis" },
  stellwerktest: { label: "Stellwerktest", multi: true, hint: "Stellwerk-Bericht" },
  schnupperbericht: { label: "Schnupperlehrbericht", multi: true, hint: "Bericht(e) zu Schnupperlehren" },
  firmenbeschrieb: { label: "Firmenbeschreibung", multi: false, hint: "Infos zur Firma, bei der du dich bewirbst" },
  stellenausschreibung: { label: "Stellenausschreibung", multi: false, hint: "Die Anzeige/Ausschreibung der Lehrstelle" },
  stellenbeschrieb: { label: "Stellenbeschreibung", multi: false, hint: "Detaillierte Beschreibung der Stelle" },
  motivationsschreiben: { label: "Motivationsschreiben", multi: false, hint: "Dein Bewerbungs-/Motivationsschreiben" },
};

export const DOC_TYPE_KEYS = Object.keys(DOC_TYPES);

export function isKnownDocType(key) {
  return Object.prototype.hasOwnProperty.call(DOC_TYPES, key);
}

// Fasst die extrahierten Texte aller hochgeladenen Dokumente zu einem kompakten
// Kontext-Block zusammen, der Prompts an das Modell mitgegeben werden kann.
// Dokumenttypen ohne Upload tauchen hier schlicht nicht auf (kein Rateraten/Erfinden).
export function buildDocumentContext(documents) {
  if (!documents || documents.length === 0) return "";
  const byType = {};
  for (const doc of documents) {
    if (!doc.extracted_text) continue;
    if (!byType[doc.doc_type]) byType[doc.doc_type] = [];
    byType[doc.doc_type].push(doc);
  }
  const parts = [];
  for (const key of Object.keys(byType)) {
    const meta = DOC_TYPES[key];
    const label = meta ? meta.label : key;
    byType[key].forEach((doc, i) => {
      const suffix = byType[key].length > 1 ? ` (${i + 1})` : "";
      parts.push(`### ${label}${suffix} — Datei "${doc.file_name}"\n${doc.extracted_text.slice(0, 4000)}`);
    });
  }
  return parts.join("\n\n");
}
