import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "sg_admin_session";

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password || null;
}

export function createAdminSessionToken(): string | null {
  const password = getAdminPassword();
  if (!password) return null;
  return createHmac("sha256", password).update("sg-admin-session").digest("hex");
}

export function verifyAdminPassword(input: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(input);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const expected = createAdminSessionToken();
  if (!expected) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminPassword());
}

export type AdminApiAccessResult =
  | { allowed: true }
  | { allowed: false; status: 401 | 503; error: string };

export async function checkAdminApiAccess(): Promise<AdminApiAccessResult> {
  if (!isAdminConfigured()) {
    return {
      allowed: false,
      status: 503,
      error: "관리자 비밀번호가 서버에 설정되지 않았습니다.",
    };
  }
  if (!(await isAdminAuthenticated())) {
    return { allowed: false, status: 401, error: "Unauthorized" };
  }
  return { allowed: true };
}

export async function adminApiGuard(): Promise<NextResponse | null> {
  const access = await checkAdminApiAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  return null;
}
