"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/questions";

const SpeechRec =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function InterviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finalized, setFinalized] = useState("");
  const [live, setLive] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/questions");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fragen konnten nicht geladen werden.");
        if (!cancelled) setQuestions(data.questions);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setupRecognition() {
    if (!SpeechRec) return null;
    const r = new SpeechRec();
    r.lang = "de-CH";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const chunk = res[0].transcript.trim();
          setFinalized((prev) => (chunk && !prev.endsWith(chunk) ? (prev ? prev + " " : "") + chunk : prev));
        } else {
          interim += res[0].transcript;
        }
      }
      setLive(interim);
    };
    r.onerror = (e) => console.warn("Speech error", e.error);
    r.onend = () => setRecognizing(false);
    return r;
  }

  function toggleRecording() {
    if (!SpeechRec) return;
    if (!recognitionRef.current) recognitionRef.current = setupRecognition();
    if (recognizing) {
      setRecognizing(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      setLive("");
      setRecognizing(true);
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }

  async function submitAnswer() {
    const transcript = (finalized + " " + live).trim();
    if (!transcript) {
      setError("Bitte zuerst eine Antwort per Spracheingabe oder Text eingeben.");
      return;
    }
    if (recognizing) toggleRecording();
    setError(null);

    const q = questions[index];
    setBusy(true);
    setBusyLabel("Antwort wird analysiert …");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: q.cat, question: q.text, transcript }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Bewertung fehlgeschlagen.");

      const newAnswers = [
        ...answers,
        {
          id: q.id,
          question: q.text,
          category: q.cat,
          transcript,
          score: result.score,
          gut: result.gut,
          nicht_gut: result.nicht_gut,
          verbesserung: result.verbesserung,
          beispiel: result.beispiel,
        },
      ];
      setAnswers(newAnswers);
      setFinalized("");
      setLive("");

      if (index + 1 >= questions.length) {
        setBusyLabel("Report wird erstellt …");
        const finishRes = await fetch("/api/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: newAnswers }),
        });
        const finishData = await finishRes.json();
        if (!finishRes.ok) throw new Error(finishData.error || "Report konnte nicht erstellt werden.");
        router.push(`/report/${finishData.sessionId}`);
        return;
      }
      setIndex(index + 1);
    } catch (e) {
      setError(e.message + " — bitte nochmals versuchen.");
    }
    setBusy(false);
    setBusyLabel("");
  }

  function skip() {
    setFinalized("");
    setLive("");
    if (recognizing) toggleRecording();
    if (!questions) return;
    if (index + 1 >= questions.length) {
      router.push("/dashboard");
    } else {
      setIndex(index + 1);
    }
  }

  if (error && !questions) {
    return (
      <main className="wrap">
        <div className="error-box">{error}</div>
        <a className="btn-primary" href="/dashboard">Zurück zum Dashboard</a>
      </main>
    );
  }

  if (!questions) {
    return (
      <main className="wrap">
        <div className="loading-line">
          <span className="spinner"></span>Fragen werden geladen …
        </div>
      </main>
    );
  }

  const q = questions[index];
  const total = questions.length;
  const pct = Math.round((index / total) * 100);
  const transcriptText = (finalized + " " + live).trim();

  return (
    <main className="wrap">
      <div className="eyebrow">Training läuft</div>
      <div className="route">
        <span className="route-label">{index + 1} / {total}</span>
        <div className="route-track">
          <div className="route-fill" style={{ width: pct + "%" }} />
        </div>
        <span className="route-label">{CATEGORIES[q.cat]}</span>
      </div>

      <div className="card ticket">
        <div className="ticket-stub">
          <div className="ticket-num">{String(index + 1).padStart(2, "0")}</div>
          <div className="ticket-total">von {total}</div>
          <div className="punch left" /><div className="punch right" />
        </div>
        <div className="ticket-body">
          <div className="ticket-cat">{CATEGORIES[q.cat]}</div>
          <div className="ticket-q">{q.text}</div>
        </div>
      </div>

      <label>Deine Antwort</label>
      <div className={"transcript-box" + (!transcriptText ? " empty" : "")}>
        {transcriptText ||
          (SpeechRec ? "Drücke auf „Aufnahme starten“ und sprich deine Antwort …" : "Spracherkennung wird von diesem Browser nicht unterstützt — bitte unten eintippen.")}
      </div>

      <textarea
        rows={2}
        placeholder="… oder hier ergänzen / eintippen"
        onChange={(e) => setFinalized(e.target.value)}
      />

      {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}

      {busy ? (
        <div className="loading-line">
          <span className="spinner"></span>{busyLabel}
        </div>
      ) : (
        <div className="controls-row" style={{ marginTop: 14 }}>
          {SpeechRec && (
            <button className={"btn mic" + (recognizing ? " recording" : "")} onClick={toggleRecording}>
              {recognizing ? "⏸ Aufnahme stoppen" : "🎙 Aufnahme starten"}
            </button>
          )}
          <button className="btn red" onClick={submitAnswer}>Antwort abschicken →</button>
          <button className="btn secondary" onClick={skip}>Überspringen</button>
        </div>
      )}
    </main>
  );
}
