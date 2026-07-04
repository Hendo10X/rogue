import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your Rogue Socials account.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
