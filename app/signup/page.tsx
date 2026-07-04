import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up on Rogue Socials to buy social media accounts and SMM services with instant delivery and secure payments.",
  alternates: { canonical: "/signup" },
};

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
