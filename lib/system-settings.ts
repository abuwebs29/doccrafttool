import { getSupabaseAdmin } from "./supabase-server";

export type SystemSettings = {
  organizationName: string;
  defaultTimezone: string;
  defaultOpenMode: "now" | "closed";
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  retentionDays: number;
  sessionTimeoutHours: number;
  brandingLogoUrl: string;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  organizationName: "FormFlow",
  defaultTimezone: "Asia/Dubai",
  defaultOpenMode: "now",
  maintenanceMode: false,
  readOnlyMode: false,
  retentionDays: 365,
  sessionTimeoutHours: 12,
  brandingLogoUrl: "",
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await getSupabaseAdmin().from("system_settings").select("data").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return { ...DEFAULT_SYSTEM_SETTINGS, ...((data?.data ?? {}) as Partial<SystemSettings>) };
}

export async function saveSystemSettings(settings: SystemSettings) {
  const { error } = await getSupabaseAdmin().from("system_settings").upsert({ id: 1, data: settings, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
