import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getManualFunding, setManualFunding } from "@/lib/manual-funding";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}

const schema = z.object({
  bank: z.string().trim().min(2, "Enter the bank name").max(80),
  accountName: z.string().trim().min(2, "Enter the account name").max(120),
  accountNumber: z.string().trim().regex(/^[0-9]{6,20}$/, "Account number should be digits only"),
  proofUrl: z.string().trim().url("Enter a full link, e.g. https://t.me/yourname"),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getManualFunding());
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  }
  await setManualFunding(parsed.data);
  return NextResponse.json({ ok: true, ...parsed.data });
}
