import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, ApiErrors } from "@/lib/api-auth";
import { getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

// GET /api/v1/balance — the API user's NGN wallet balance.
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth) return ApiErrors.unauthorized();

  const result = await getWalletBalance(auth.userId, "NGN");
  const wallet = Array.isArray(result) ? result[0] : result;

  return NextResponse.json({
    data: {
      balance: wallet?.balance ?? "0",
      currency: wallet?.currency ?? "NGN",
    },
  });
}
