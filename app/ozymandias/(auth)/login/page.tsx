"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/logo";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric only"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Login failed");
      return;
    }
    router.replace("/ozymandias");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="glow pointer-events-none absolute inset-0 m-auto h-96 max-w-2xl opacity-60"
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="surface relative w-full max-w-sm rounded-3xl p-2"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <Wordmark />
          <span className="flex items-center gap-1.5 rounded-full bg-[#ff7a1a]/12 px-2.5 py-1 text-xs font-medium text-[#ffc08f]">
            <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} className="size-3" />
            Ozymandias
          </span>
        </div>

        <div className="flex flex-col gap-5 px-4 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em]">Admin sign in</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Restricted area. Access is logged.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-[0.8125rem] font-medium">
              Username
            </label>
            <Input id="username" autoComplete="username" className="h-10" {...register("username")} />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-[0.8125rem] font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-[0.6875rem] text-muted-foreground">
                Alphanumeric only, 6+ characters
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
