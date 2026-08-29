# Lehrstellen Interview-Training

Eine Web-App zum Üben von Lehrstellen-Vorstellungsgesprächen: Login pro Nutzer,
25 Fragen aus 8 Kategorien, Spracheingabe, automatische Bewertung durch Claude
und ein persönlicher Verlauf in einer echten Datenbank.

Diese Anleitung setzt **keine** Vorkenntnisse voraus. Sie dauert ca. 20–30 Minuten
und alles darin ist kostenlos (Gratis-Stufen von Supabase und Vercel).

---

## Was du am Ende hast

Einen öffentlichen Link (z. B. `https://dein-projekt.vercel.app`), den du an
beliebige Personen weitergeben kannst. Jede Person registriert sich mit
E-Mail + Passwort und hat danach ihr eigenes, getrenntes Training samt
Verlauf — alles in einer echten Datenbank, nicht nur im Browser.

---

## Schritt 1 — Datenbank & Login bei Supabase einrichten (kostenlos)

1. Gehe auf **[supabase.com](https://supabase.com)** und erstelle einen kostenlosen Account.
2. Klicke auf **New Project**. Wähle einen Namen (z. B. "lehrstellen-training"),
   ein Datenbank-Passwort (aufschreiben!) und eine Region nahe der Schweiz
   (z. B. Frankfurt). Klicke **Create new project** — das dauert ca. 2 Minuten.
3. Sobald das Projekt bereit ist: Im linken Menü auf **SQL Editor** klicken,
   dann **New query**.
4. Öffne die Datei `supabase/schema.sql` aus diesem Projekt, kopiere den
   **gesamten Inhalt**, füge ihn im SQL-Editor ein und klicke **Run**.
   Das legt alle Tabellen, Sicherheitsregeln und Hilfsfunktionen an.
5. Im linken Menü auf **Project Settings → API** klicken. Dort findest du:
   - **Project URL** (sieht aus wie `https://xxxxx.supabase.co`)
   - **anon public** Key (ein langer Text)
   Beide brauchst du gleich in Schritt 3.
6. Optional, aber empfohlen für den Start: Unter **Authentication → Providers →
   Email** kannst du "Confirm email" vorübergehend ausschalten, damit sich
   Test-Nutzer sofort einloggen können, ohne eine Bestätigungs-Mail zu bekommen.
   Für den echten Betrieb später wieder einschalten.

## Schritt 2 — Anthropic API-Key besorgen

1. Gehe auf **[console.anthropic.com](https://console.anthropic.com)**, erstelle
   einen Account (falls noch nicht vorhanden) und lege einen **API Key** an.
2. Kopiere den Key (beginnt mit `sk-ant-...`) — brauchst du in Schritt 3.
3. Beachte: Jede Bewertung einer Antwort verursacht kleine Kosten über die
   Anthropic-API (nicht über claude.ai). Für eine Trainingsrunde mit 25 Fragen
   sind das üblicherweise wenige Rappen bis niedrige Franken-Beträge, je nach
   Nutzung. Du kannst in der Anthropic Console ein Ausgabenlimit setzen.

## Schritt 3 — Code auf GitHub hochladen

1. Falls noch nicht vorhanden: Account auf **[github.com](https://github.com)** erstellen.
2. Neues **leeres** Repository erstellen (z. B. "lehrstellen-training").
3. Lade den gesamten Inhalt dieses Ordners in das Repository hoch (per
   GitHub-Weboberfläche "Upload files" reicht für den Start, oder via `git`:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DEIN-NUTZERNAME/lehrstellen-training.git
   git push -u origin main
   ```

## Schritt 4 — Deployment auf Vercel (kostenlos)

1. Gehe auf **[vercel.com](https://vercel.com)** und melde dich mit deinem
   GitHub-Account an.
2. Klicke **Add New → Project**, wähle dein eben hochgeladenes Repository aus.
3. Vercel erkennt automatisch, dass es sich um eine Next.js-App handelt.
   Vor dem Klick auf **Deploy**: öffne **Environment Variables** und trage
   genau diese drei Werte ein (Namen exakt so übernehmen):

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | die Project URL aus Schritt 1.5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | der anon public Key aus Schritt 1.5 |
   | `ANTHROPIC_API_KEY` | dein Key aus Schritt 2 |

4. Klicke **Deploy**. Nach ca. 1–2 Minuten bekommst du einen Link wie
   `https://lehrstellen-training.vercel.app` — das ist dein öffentlicher Link.
5. Öffne den Link, registriere dich mit einer E-Mail-Adresse und probiere eine
   Runde aus.

## Diesen Link weitergeben

Jede externe Person öffnet einfach denselben Link auf ihrem eigenen Computer,
registriert sich mit eigener E-Mail und hat ab dann ihr eigenes, komplett
getrenntes Training samt Verlauf (dank Row-Level-Security in der Datenbank
sieht niemand die Daten von jemand anderem).

---

## Später: Bezahlfunktion hinzufügen

In `supabase/schema.sql` gibt es bereits eine Spalte `plan` in der Tabelle
`profiles` (Standardwert `'free'`). Für ein echtes Abo (z. B. via Stripe)
würdest du:

1. Ein Stripe-Konto einrichten und ein Produkt/Abo anlegen.
2. Einen Stripe-Checkout-Button auf dem Dashboard einbauen.
3. Einen Webhook-Endpoint (`/api/stripe-webhook`) einbauen, der bei
   erfolgreicher Zahlung `profiles.plan` auf `'pro'` setzt.
4. In den API-Routen (z. B. `/api/score`) prüfen, ob `profiles.plan === 'pro'`,
   bevor automatische Bewertungen erlaubt werden.

Sag mir jederzeit Bescheid, wenn du so weit bist — dann bauen wir das konkret ein.

---

## Lokal entwickeln (optional)

```
npm install
cp .env.local.example .env.local   # dann echte Werte eintragen
npm run dev
```
App läuft dann auf `http://localhost:3000`.

## Projektstruktur

```
app/
  login/            Login-Seite
  signup/           Registrierungs-Seite
  dashboard/        Übersicht + "Neues Training starten"
  interview/        Der eigentliche Interview-Ablauf (Sprache, Ticket-UI)
  report/[id]/      Auswertungs-Report einer Runde
  api/
    questions/      Liefert die 25 Fragen für die nächste Runde
    score/          Bewertet eine einzelne Antwort (ruft Claude auf)
    finish/         Schliesst die Runde ab, speichert alles in der Datenbank
lib/
  questions.js      Der 100-Fragen-Pool + Auswahllogik
  anthropic.js       Hilfsfunktion für den Aufruf der Anthropic-API
  supabase/         Datenbank-Verbindung (Browser & Server)
supabase/schema.sql Datenbankstruktur zum Einspielen in Supabase
```
