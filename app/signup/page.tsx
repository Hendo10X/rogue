import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { AuthShell } from "@/components/auth-shell";
import { ReferralCapture } from "@/components/referral/referral-capture";
import { normalizeCode } from "@/lib/referral";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up on Rogue Socials to buy social media accounts and SMM services with instant delivery and secure payments.",
  alternates: { canonical: "/signup" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const code = normalizeCode(Array.isArray(ref) ? ref[0] : ref);

  return (
    <AuthShell title="Create your account" subtitle="It takes a few seconds. No fees to join.">
      {code && <ReferralCapture code={code} />}
      <SignupForm />
    </AuthShell>
  );
}
