import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <div aria-hidden className="glow pointer-events-none absolute inset-0 m-auto h-96 max-w-3xl opacity-70" />
        <div className="relative flex flex-col items-center gap-6 py-24 text-center">
          <h1 className="text-rogue-gradient text-[7rem] leading-none font-semibold tracking-[-0.07em] sm:text-[11rem]">
            404
          </h1>
          <p className="text-xl font-medium tracking-[-0.02em]">This page wandered off.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/">Return home</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
