"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldSet, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm border shadow-none">
        <CardHeader>
          <h1 className="text-xl font-semibold">Admin Login</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    autoComplete="username"
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-destructive text-sm">
                      {errors.username.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-destructive text-sm">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Alphanumeric only, 6+ characters
                  </p>
                </Field>
              </FieldGroup>
            </FieldSet>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
