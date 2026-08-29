import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSessionQuestions } from "@/lib/questions";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: exposure } = await supabase
    .from("question_exposure")
    .select("question_id, times_asked")
    .eq("user_id", user.id);

  const counts = {};
  exposure?.forEach((e) => {
    counts[e.question_id] = e.times_asked;
  });

  const questions = buildSessionQuestions(counts);
  return NextResponse.json({ questions });
}
