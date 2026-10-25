import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, FileSearchIcon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { CustomerPage } from "@/components/dashboard/customer-page";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/tools/2fa",
    title: "2FA codes",
    body: "Paste a 2FA key from your log and get the login code. Free, and it never leaves your device.",
    icon: SquareLock02Icon,
  },
  {
    href: "/tools/request-log",
    title: "Request a log",
    body: "Can't find what you need? Tell us and we'll source it.",
    icon: FileSearchIcon,
  },
];

export default function ToolsPage() {
  return (
    <CustomerPage>
      <PageHeader title="Tools" description="Helpers for the logs you buy." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="surface group flex flex-col gap-3 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <HugeiconsIcon icon={t.icon} strokeWidth={1.75} className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 font-medium">
                {t.title}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="text-sm text-muted-foreground">{t.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </CustomerPage>
  );
}
