import { NextResponse } from "next/server";
import { classifyClient, type AnalyticsEventType } from "@/lib/analytics";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const allowedEvents = new Set<AnalyticsEventType>(["view", "start", "abandon"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { formId?: string; sessionId?: string; eventType?: AnalyticsEventType; durationMs?: number; sectionIndex?: number };
    if (!body.formId || !body.sessionId || !body.eventType || !allowedEvents.has(body.eventType)) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    if (body.sessionId.length > 100) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: form } = await supabase.from("forms").select("id,status").eq("id", body.formId).maybeSingle();
    if (!form || form.status !== "published") return NextResponse.json({ ok: true });
    const userAgent = request.headers.get("user-agent") ?? "";
    const { deviceType, browserName } = classifyClient(userAgent);
    const row = {
      form_id: body.formId,
      session_id: body.sessionId,
      event_type: body.eventType,
      duration_ms: Number.isFinite(body.durationMs) ? Math.max(0, Math.min(86_400_000, Math.round(body.durationMs!))) : null,
      device_type: deviceType,
      browser_name: browserName,
      country_code: (request.headers.get("cf-ipcountry") || "Unknown").slice(0, 8),
      metadata: typeof body.sectionIndex === "number" ? { sectionIndex: body.sectionIndex } : {},
    };
    const query = body.eventType === "abandon"
      ? supabase.from("form_analytics_events").insert(row)
      : supabase.from("form_analytics_events").upsert(row, { onConflict: "form_id,session_id,event_type", ignoreDuplicates: true });
    const { error } = await query;
    if (error) console.error("Analytics event failed", error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics tracking failed", error);
    return NextResponse.json({ ok: true });
  }
}
