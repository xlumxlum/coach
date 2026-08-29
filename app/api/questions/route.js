import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSessionQuestions } from "@/lib/questions";

export const maxDuration = 60;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const questions = await buildSessionQuestions(supabase, user.id);
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Fragen konnten nicht erstellt werden." }, { status: 500 });
  }
}
