import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getSystemSettings } from "@/lib/system-settings";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const settings = await getSystemSettings();
    if (settings.maintenanceMode) return NextResponse.json({ error: "Forms are temporarily unavailable for maintenance.", form: null }, { status: 503 });
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
