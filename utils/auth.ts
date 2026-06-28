import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { nextCookies } from "better-auth/next-js";
import { createWallet } from "@/lib/wallet";

function getTrustedOrigins(): string[] {
  const origins = ["http://localhost:3000"];
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }
  return origins;
}

function getSocialProviders() {
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  // Only register Google when both env vars are present so the app keeps
  // booting in environments where Google sign-in isn't configured yet.
  if (googleId && googleSecret) {
    return {
      google: {
        clientId: googleId,
        clientSecret: googleSecret,
      },
    };
  }
  return undefined;
}

export const auth = betterAuth({
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: getSocialProviders(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
        fieldName: "phoneNumber",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createWallet(user.id);
          // Notify admin of new sign-up (non-blocking)
          try {
            const { sendAdminSignupNotification } = await import("@/lib/email");
            await sendAdminSignupNotification({
              userId: user.id,
              userName: user.name ?? "Unknown",
              userEmail: user.email ?? "",
              phoneNumber: (user as { phoneNumber?: string }).phoneNumber,
            });
          } catch { /* non-critical */ }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
