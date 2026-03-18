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
import { z } from "zod";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
});

export function LoginForm({
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
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      
      if (result.error) {
        toast.error(result.error.message || "Invalid email or password");
        setLoading(false);
        return;
      }
      
      toast.success("Logged in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-8 font-display", className)} {...props}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-purple-50 sm:text-3xl">
          Login to your account
        </h2>
        <p className="mt-2 text-sm text-purple-300/40">
          Enter your email below to login to your account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup className="gap-5">
            <Field>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-purple-200/70">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@example.com"
                        className="h-11 rounded-lg border-purple-500/15 bg-purple-950/30 text-purple-50 placeholder:text-purple-400/30 focus-visible:border-purple-400/40 focus-visible:ring-purple-400/20"
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
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium text-purple-200/70">Password</FormLabel>
                      <button
                        type="button"
                        className="text-xs text-purple-400/50 underline-offset-4 transition-colors hover:text-purple-300 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="password"
                          type={passwordVisible ? "text" : "password"}
                          className="h-11 rounded-lg border-purple-500/15 bg-purple-950/30 pe-9 text-purple-50 placeholder:text-purple-400/30 focus-visible:border-purple-400/40 focus-visible:ring-purple-400/20"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setPasswordVisible((v) => !v)}
                          aria-label={passwordVisible ? "Hide password" : "Show password"}
                          aria-pressed={passwordVisible}
                          className="absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-purple-400/50 transition-colors hover:text-purple-300 focus-visible:outline-none">
                          {passwordVisible ? (
                            <EyeOff size={16} strokeWidth={2} aria-hidden />
                          ) : (
                            <Eye size={16} strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Field>
            <Field className="pt-2">
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg text-sm font-semibold">
                {loading ? (
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 size-4 animate-spin" />
                ) : (
                  "Login"
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-purple-500/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#05021a] px-4 text-purple-400/40">or</span>
        </div>
      </div>

      <FieldDescription className="text-center text-sm text-purple-300/40">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-purple-400 underline-offset-4 transition-colors hover:text-purple-300 hover:underline">
          Sign up
        </Link>
      </FieldDescription>
    </div>
  );
}
