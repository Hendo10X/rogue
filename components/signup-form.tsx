"use client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authClient } from "@/utils/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { passwordSchema } from "@/components/inputs/validity";
import { z } from "zod";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Check, Eye, EyeOff, X } from "lucide-react";

const formSchema = z.object({
  email: z.email(),
  password: passwordSchema.max(100),
  name: z.string().min(3).max(100),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long")
    .regex(/^\+?[0-9]+$/, "Enter a valid phone number (e.g. +2348012345678)"),
});

const PASSWORD_REQUIREMENTS = [
  "At least 8 characters",
  "At least 1 number",
  "At least 1 lowercase letter",
  "At least 1 uppercase letter",
] as const;

function getPasswordErrors(password: string): string[] {
  const result = passwordSchema.safeParse(password);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.message);
}

function getStrengthColor(score: number) {
  if (score === 0) return "#e0e0e0";
  if (score <= 1) return "#f87171";
  if (score <= 2) return "#fb923c";
  if (score === 3) return "#facc15";
  return "#4ade80";
}

function getStrengthText(score: number) {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak password";
  if (score === 3) return "Medium password";
  return "Strong password";
}

const inputStyles =
  "h-11 rounded-lg border-purple-500/15 bg-purple-950/30 text-purple-50 placeholder:text-purple-400/30 focus-visible:border-purple-400/40 focus-visible:ring-purple-400/20";
const labelStyles = "text-sm font-medium text-purple-200/70";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phoneNumber: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (authClient.signUp.email as any)({
        email: values.email,
        password: values.password,
        name: values.name,
        phoneNumber: values.phoneNumber,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to sign up");
        setLoading(false);
        return;
      }

      toast.success("Signed up successfully");
      router.push("/login");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to sign up";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn("flex flex-col gap-8 font-display", className)}
      {...props}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-purple-50 sm:text-3xl">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-purple-300/40">
          Enter your details below to get started
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Two-column row for username and email on desktop */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      type="text"
                      className={inputStyles}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelStyles}>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="email@example.com"
                      className={inputStyles}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FieldGroup className="gap-5">
            <Field>
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelStyles}>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+2348012345678"
                        type="tel"
                        className={inputStyles}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Field>
            <Field>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  const passwordErrors = getPasswordErrors(
                    form.watch("password") ?? "",
                  );
                  const strengthScore = 4 - passwordErrors.length;
                  return (
                    <FormItem>
                      <FormLabel className={labelStyles}>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="password"
                            type={passwordVisible ? "text" : "password"}
                            className={cn(inputStyles, "pe-9")}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisible((v) => !v)}
                            aria-label={
                              passwordVisible
                                ? "Hide password"
                                : "Show password"
                            }
                            aria-pressed={passwordVisible}
                            className="absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-purple-400/50 transition-colors hover:text-purple-300 focus-visible:outline-none">
                            {passwordVisible ? (
                              <EyeOff
                                size={16}
                                strokeWidth={2}
                                aria-hidden
                              />
                            ) : (
                              <Eye size={16} strokeWidth={2} aria-hidden />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <div
                        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-purple-500/10"
                        role="progressbar"
                        aria-valuenow={strengthScore}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-label="Password strength">
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={{
                            backgroundColor:
                              getStrengthColor(strengthScore),
                            width: `${(strengthScore / 4) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium text-purple-200/60">
                        {getStrengthText(strengthScore)}. Must contain:
                      </p>
                      <ul
                        className="space-y-1.5"
                        aria-label="Password requirements">
                        {PASSWORD_REQUIREMENTS.map((reqText) => (
                          <li
                            key={reqText}
                            className="flex items-center space-x-2">
                            {passwordErrors.includes(reqText) ? (
                              <X
                                size={14}
                                className="text-purple-400/30"
                                aria-hidden
                              />
                            ) : (
                              <Check
                                size={14}
                                className="text-emerald-500"
                                aria-hidden
                              />
                            )}
                            <span
                              className={cn(
                                "text-xs",
                                passwordErrors.includes(reqText)
                                  ? "text-purple-400/40"
                                  : "text-emerald-500/80",
                              )}>
                              {reqText}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </Field>
            <Field className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg text-sm font-semibold">
                {loading ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={16}
                    className="mr-2 size-4 animate-spin"
                  />
                ) : (
                  "Create Account"
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </Form>

      <div className="space-y-3">
        <FieldDescription className="text-center text-xs text-purple-400/30">
          By signing up, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-purple-400/60 underline-offset-4 transition-colors hover:text-purple-300 hover:underline">
            Terms and Conditions
          </Link>
        </FieldDescription>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-purple-500/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#05021a] px-4 text-purple-400/40">or</span>
          </div>
        </div>

        <FieldDescription className="text-center text-sm text-purple-300/40">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-purple-400 underline-offset-4 transition-colors hover:text-purple-300 hover:underline">
            Login
          </Link>
        </FieldDescription>
      </div>
    </div>
  );
}
