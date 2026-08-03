import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { data, error } = await getSupabaseAdmin().from("forms").select("data").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    if (!data) return NextResponse.json({ form: null }, { status: 404 });
    return NextResponse.json({ form: data.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase connection unavailable.";
    console.error("Public form API failed:", message);
    return NextResponse.json({ error: message, form: null }, { status: 503 });
  }
}
