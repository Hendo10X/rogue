import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Shield, Zap, Clock } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh font-display">
      {/* Left branded panel — hidden on mobile */}
      <div className="relative hidden w-[52%] overflow-hidden bg-[#08021f] lg:flex lg:flex-col lg:justify-between">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[160px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[140px]" />
          <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-fuchsia-600/8 blur-[120px]" />
        </div>

        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#a78bfa" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <Link href="/">
            <Image
              src="/Fynixlogs.svg"
              alt="Fynix Logs"
              width={222}
              height={85}
              className="h-16 w-auto"
            />
          </Link>

          {/* Center tagline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Welcome<br />
              <span className="bg-linear-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                back.
              </span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-purple-200/50">
              Access your dashboard, manage your orders, and explore the marketplace for premium social media logs.
            </p>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-4">
            {[
              { icon: Zap, label: "Instant Delivery" },
              { icon: Shield, label: "Verified Logs" },
              { icon: Clock, label: "24/7 Support" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-full border border-purple-500/15 bg-purple-950/40 px-4 py-2 text-xs font-medium text-purple-300/70">
                <item.icon className="size-3.5" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 flex-col bg-[#05021a]">
        {/* Mobile: ambient glow */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-20 right-0 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[250px] w-[250px] rounded-full bg-violet-500/8 blur-[100px]" />
        </div>

        {/* Mobile logo */}
        <div className="relative z-10 px-6 pt-8 lg:hidden">
          <Link href="/">
            <Image
              src="/Fynixlogs.svg"
              alt="Fynix Logs"
              width={222}
              height={85}
              className="h-14 w-auto"
            />
          </Link>
        </div>

        {/* Form centered */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
