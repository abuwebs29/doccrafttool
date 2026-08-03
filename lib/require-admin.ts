import { cookies } from "next/headers";
import { COOKIE_NAME, verifyAdminToken } from "./admin-auth";

export async function isAdminRequest() {
  const store = await cookies();
  return verifyAdminToken(store.get(COOKIE_NAME)?.value, process.env.ADMIN_SESSION_SECRET);
}
