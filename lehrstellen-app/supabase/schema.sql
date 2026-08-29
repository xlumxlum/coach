-- ============================================================
-- Lehrstellen Interview-Training — Datenbankschema für Supabase
-- Führe dieses gesamte Skript im Supabase SQL-Editor aus
-- (Dashboard -> SQL Editor -> New query -> einfügen -> Run).
-- ============================================================

-- Profile pro Nutzer (Basis für spätere Abo-/Bezahlfunktion)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',           -- später z.B. 'free' | 'pro'
  created_at timestamptz not null default now()
);

-- Eine abgeschlossene oder laufende Trainingsrunde
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  overall_score int,
  category_scores jsonb,
  overview_feedback text,
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  status text not null default 'in_progress'    -- 'in_progress' | 'done'
);

-- Einzelne Frage/Antwort/Bewertung innerhalb einer Runde
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  category text not null,
  transcript text not null,
  score int not null,
  feedback_good text,
  feedback_bad text,
  feedback_tip text,
  feedback_example text,
  created_at timestamptz not null default now()
);

-- Wie oft wurde eine bestimmte Frage einem Nutzer schon gestellt
-- (steuert die Varianz/Adaptivität zwischen Trainingsrunden)
create table if not exists public.question_exposure (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  times_asked int not null default 0,
  primary key (user_id, question_id)
);

-- Hilfsfunktion: atomar hochzählen statt select-then-update
create or replace function public.increment_exposure(p_user_id uuid, p_question_id text)
returns void as $$
begin
  insert into public.question_exposure (user_id, question_id, times_asked)
  values (p_user_id, p_question_id, 1)
  on conflict (user_id, question_id)
  do update set times_asked = public.question_exposure.times_asked + 1;
end;
$$ language plpgsql security definer;

-- Neues Profil automatisch anlegen, sobald sich jemand registriert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security: jeder Nutzer sieht/ändert nur seine eigenen Daten
-- ============================================================
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.answers enable row level security;
alter table public.question_exposure enable row level security;

create policy "profiles: eigene Zeile lesen" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: eigene Zeile ändern" on public.profiles
  for update using (auth.uid() = id);

create policy "sessions: eigene lesen" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions: eigene erstellen" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions: eigene ändern" on public.sessions
  for update using (auth.uid() = user_id);

create policy "answers: eigene lesen" on public.answers
  for select using (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "answers: eigene erstellen" on public.answers
  for insert with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "question_exposure: eigene lesen" on public.question_exposure
  for select using (auth.uid() = user_id);
create policy "question_exposure: eigene schreiben" on public.question_exposure
  for insert with check (auth.uid() = user_id);
create policy "question_exposure: eigene ändern" on public.question_exposure
  for update using (auth.uid() = user_id);
