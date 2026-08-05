import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/require-admin";
import { getSystemSettings, saveSystemSettings } from "@/lib/system-settings";
import { writeAudit } from "@/lib/audit";

const SettingsSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  defaultTimezone: z.string().trim().min(1).max(80),
  defaultOpenMode: z.enum(["now", "closed"]),
  maintenanceMode: z.boolean(),
  readOnlyMode: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650),
  sessionTimeoutHours: z.number().int().min(1).max(168),
  brandingLogoUrl: z.string().trim().max(500),
});

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ settings: await getSystemSettings() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load settings." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = SettingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  try {
    await saveSystemSettings(parsed.data);
    await writeAudit("system.settings.updated", undefined, { maintenanceMode: parsed.data.maintenanceMode, readOnlyMode: parsed.data.readOnlyMode });
    return NextResponse.json({ settings: parsed.data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save settings." }, { status: 500 }); }
}
