import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up on Rogue Socials to buy social media accounts and SMM services with instant delivery and secure payments.",
  alternates: { canonical: "/signup" },
};

export default function Page() {
  return (
    <AuthShell title="Create your account" subtitle="It takes a few seconds. No fees to join.">
      <SignupForm />
    </AuthShell>
  );
}
