import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
      <CircleAlert
        className="text-muted-foreground size-16"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Oops, you found the wrong page
        </h1>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}
