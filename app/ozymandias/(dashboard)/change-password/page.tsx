"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldSet, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric only"),
});

type FormData = z.infer<typeof schema>;

export default function AdminChangePasswordPage() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/admin/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to change password");
      return;
    }
    toast.success("Password changed");
    setDone(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Change Password</h1>
      <Card className="max-w-md border shadow-none">
        <CardHeader>
          <h2 className="font-medium">New password</h2>
          <p className="text-muted-foreground text-sm">
            Alphanumeric only, at least 6 characters
          </p>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-muted-foreground text-sm">Password updated.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      {...register("newPassword")}
                    />
                    {errors.newPassword && (
                      <p className="text-destructive text-sm">
                        {errors.newPassword.message}
                      </p>
                    )}
                  </Field>
                </FieldGroup>
              </FieldSet>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
