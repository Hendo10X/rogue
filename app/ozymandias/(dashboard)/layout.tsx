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
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 bg-background/80 shadow-[0_1px_0_rgb(255_255_255/0.05)] backdrop-blur-xl">
        <AdminNav username={admin.username} />
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
