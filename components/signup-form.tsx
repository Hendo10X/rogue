"use client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { authClient } from "@/utils/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      className={cn("flex flex-col gap-4 font-display", className)}
      {...props}>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Welcome to Roguesocials</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
              <FieldGroup className="gap-3">
                <Field>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Field>
                <Field>
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+2348012345678"
                            type="tel"
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="password"
                                type={passwordVisible ? "text" : "password"}
                                className="pe-9"
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
                                className="absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50">
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
                            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border"
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
                          <p className="text-sm font-medium text-foreground">
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
                                    size={16}
                                    className="text-muted-foreground/80"
                                    aria-hidden
                                  />
                                ) : (
                                  <Check
                                    size={16}
                                    className="text-emerald-500"
                                    aria-hidden
                                  />
                                )}
                                <span
                                  className={cn(
                                    "text-xs",
                                    passwordErrors.includes(reqText)
                                      ? "text-muted-foreground"
                                      : "text-emerald-600",
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
                <Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-full">
                    {loading ? (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={16}
                        className="mr-2 size-4 animate-spin"
                      />
                    ) : (
                      "Sign Up"
                    )}
                  </Button>

                   <FieldDescription className="text-center">
                    By signing up, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline-offset-4 hover:underline hover:text-primary">
                      Terms and Conditions
                    </Link>
                  </FieldDescription>

                  <FieldDescription className="text-center">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="underline-offset-4 hover:underline hover:text-muted-foreground">
                      Login
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
