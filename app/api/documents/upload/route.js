import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isKnownDocType, DOC_TYPES } from "@/lib/documents";
import { extractTextFromFile } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const docType = form.get("doc_type");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  }
  if (!isKnownDocType(docType)) {
    return NextResponse.json({ error: "Unbekannter Dokumenttyp." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Datei ist zu gross (max. 15 MB)." }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: "Dateityp nicht unterstützt. Erlaubt: PDF, JPG, PNG, WEBP, TXT, DOCX." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let extractedText = "";
  try {
    if (mimeType === "text/plain") {
      extractedText = buffer.toString("utf-8").slice(0, 8000);
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = (result.value || "").slice(0, 8000);
    } else {
      extractedText = await extractTextFromFile({
        base64: buffer.toString("base64"),
        mimeType,
        fileName: file.name,
      });
    }
  } catch (e) {
    // Textextraktion ist ein Zusatznutzen – schlägt sie fehl, wird die Datei trotzdem gespeichert.
    extractedText = "";
  }

  const meta = DOC_TYPES[docType];
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${user.id}/${docType}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Bei Einzeldokument-Kategorien ersetzt der neue Upload die vorherige(n) Datei(en).
  if (!meta.multi) {
    const { data: existing } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .eq("doc_type", docType);
    if (existing && existing.length) {
      await supabase.storage.from("documents").remove(existing.map((d) => d.storage_path));
      await supabase.from("documents").delete().eq("user_id", user.id).eq("doc_type", docType);
    }
  }

  const { data: row, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      doc_type: docType,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: mimeType,
      extracted_text: extractedText,
    })
    .select("id, doc_type, file_name, mime_type, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ document: row });
}
