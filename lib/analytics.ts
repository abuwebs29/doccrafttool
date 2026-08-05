export type AnalyticsEventType = "view" | "start" | "complete" | "abandon";

export function classifyClient(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const deviceType = /ipad|tablet/.test(ua) ? "Tablet" : /mobile|iphone|android/.test(ua) ? "Mobile" : "Desktop";
  const browserName = ua.includes("edg/") ? "Edge" : ua.includes("opr/") || ua.includes("opera") ? "Opera" : ua.includes("firefox/") ? "Firefox" : ua.includes("chrome/") || ua.includes("crios/") ? "Chrome" : ua.includes("safari/") ? "Safari" : "Other";
  return { deviceType, browserName };
}
