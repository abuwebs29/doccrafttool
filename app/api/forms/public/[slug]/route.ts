import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { data, error } = await getSupabaseAdmin().from("forms").select("data").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ form: null }, { status: 404 });
    return NextResponse.json({ form: data.data });
  } catch {
    return NextResponse.json({ form: null }, { status: 503 });
  }
}
