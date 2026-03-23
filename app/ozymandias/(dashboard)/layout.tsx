import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { verifyAdminSession, getSetting, setSetting } from "@/lib/admin-auth";
import { AdminNav } from "../admin-nav";

const MAX_IP_ENTRIES = 200;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/ozymandias/login");
  const admin = await verifyAdminSession(token);
  if (!admin) redirect("/ozymandias/login");

  // Log IP access (non-blocking)
  try {
    const reqHeaders = await headers();
    const ip =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "unknown";
    const userAgent = reqHeaders.get("user-agent") || "unknown";

    const raw = await getSetting("admin_ip_log");
    const entries: { ip: string; userAgent: string; timestamp: string; adminId: string }[] = raw
      ? JSON.parse(raw)
      : [];

    entries.push({ ip, userAgent, timestamp: new Date().toISOString(), adminId: admin.id });
    if (entries.length > MAX_IP_ENTRIES) {
      entries.splice(0, entries.length - MAX_IP_ENTRIES);
    }
    await setSetting("admin_ip_log", JSON.stringify(entries));
  } catch { /* non-critical */ }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <AdminNav username={admin.username} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
