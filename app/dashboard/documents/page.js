"use client";
import { useEffect, useRef, useState } from "react";
import { DOC_TYPES, DOC_TYPE_KEYS } from "@/lib/documents";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState({});

  async function load() {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unterlagen konnten nicht geladen werden.");
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(docType, file) {
    if (!file) return;
    setError(null);
    setUploading((u) => ({ ...u, [docType]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("doc_type", docType);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload fehlgeschlagen.");
      await load();
    } catch (e) {
      setError(e.message);
    }
    setUploading((u) => ({ ...u, [docType]: false }));
  }

  async function handleDelete(id) {
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Löschen fehlgeschlagen.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const byType = {};
  (documents || []).forEach((d) => {
    if (!byType[d.doc_type]) byType[d.doc_type] = [];
    byType[d.doc_type].push(d);
  });

  return (
    <main className="wrap">
      <div className="topbar">
        <a href="/dashboard" style={{ color: "var(--grey)" }}>← Zurück zum Dashboard</a>
      </div>

      <div className="eyebrow">Optionale Unterlagen</div>
      <h1 className="mast">Deine Unterlagen</h1>
      <p className="sub">
        Lade optional Unterlagen hoch, damit sich die Trainingsfragen besser auf deine Situation beziehen –
        z. B. auf deine Noten, die Firma, bei der du dich bewirbst, oder deine Schnupperlehre. Nichts davon ist Pflicht:
        fehlt eine Unterlage, werden dazu einfach keine Fragen gestellt.
      </p>

      {error && <div className="error-box">{error}</div>}
      {!documents && !error && (
        <div className="loading-line"><span className="spinner"></span>Unterlagen werden geladen …</div>
      )}

      {documents && (
        <>
          <div className="section-title">Bleiben erhalten (mehrere möglich)</div>
          {DOC_TYPE_KEYS.filter((k) => DOC_TYPES[k].multi).map((key) => (
            <DocSlot
              key={key}
              docKey={key}
              meta={DOC_TYPES[key]}
              files={byType[key] || []}
              uploading={!!uploading[key]}
              onUpload={(file) => handleUpload(key, file)}
              onDelete={handleDelete}
            />
          ))}

          <div className="section-title">Zu deiner aktuellen Bewerbung (neuer Upload ersetzt den alten)</div>
          {DOC_TYPE_KEYS.filter((k) => !DOC_TYPES[k].multi).map((key) => (
            <DocSlot
              key={key}
              docKey={key}
              meta={DOC_TYPES[key]}
              files={byType[key] || []}
              uploading={!!uploading[key]}
              onUpload={(file) => handleUpload(key, file)}
              onDelete={handleDelete}
            />
          ))}
        </>
      )}
    </main>
  );
}

function DocSlot({ docKey, meta, files, uploading, onUpload, onDelete }) {
  const inputRef = useRef(null);
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{meta.label}</div>
          <div style={{ color: "var(--grey)", fontSize: 12.5 }}>{meta.hint}</div>
        </div>
        <button
          type="button"
          className="btn secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Lädt hoch …" : meta.multi ? "+ Datei hinzufügen" : files.length ? "Datei ersetzen" : "Datei hochladen"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
          style={{ display: "none" }}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </div>

      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {files.map((f) => (
            <li
              key={f.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "8px 0",
                borderTop: "1px solid var(--grey-line)",
              }}
            >
              <span>
                {f.file_name}{" "}
                <span style={{ color: "var(--grey)" }}>
                  ({new Date(f.created_at).toLocaleDateString("de-CH")})
                </span>
              </span>
              <button
                className="btn secondary"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => onDelete(f.id)}
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
