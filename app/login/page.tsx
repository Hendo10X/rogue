import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your Rogue Socials account.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Rogue Socials account.">
      <LoginForm />
    </AuthShell>
  );
}
