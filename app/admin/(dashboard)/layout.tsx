import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "../admin-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) redirect("/admin/login");
  const admin = await verifyAdminSession(token);
  if (!admin) redirect("/admin/login");

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
