import { cn } from "@/lib/utils";

/**
 * Every dashboard and admin page opens the same way: the title, a quiet
 * description, and an optional action on the right. No label above it.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  /** @deprecated Kept so older call sites compile; it is not rendered. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** A quiet heading for a block on a page, with an optional action. */
export function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <span className="text-sm font-medium text-foreground/90">{children}</span>
      {action}
    </div>
  );
}

/** A rounded stat tile. Sits in a StatGrid. */
export function StatCard({
  label,
  value,
  hint,
  tone,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "danger";
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-col gap-3 rounded-2xl p-5 transition-colors duration-200 hover:bg-[oklch(0.19_0.005_60)]",
        tone === "danger" && "bg-[oklch(0.2_0.04_25)] hover:bg-[oklch(0.22_0.05_25)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <span
        className={cn(
          "text-2xl font-semibold tracking-[-0.035em] tabular-nums",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Responsive grid of StatCards. */
export function StatGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>
  );
}

/** Rounded empty state, used wherever a list has nothing in it yet. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-16 text-center">
      {icon && (
        <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05] text-[#ffb27a] [&_svg]:size-5">
          {icon}
        </span>
      )}
      <h2 className="text-sm font-medium">{title}</h2>
      {description && <p className="max-w-xs text-[0.8125rem] text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
