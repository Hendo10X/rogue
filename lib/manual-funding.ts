import { getSetting, setSetting } from "@/lib/admin-auth";

/** Bank details shown for manual (bank transfer) deposits. Editable in admin. */
export type ManualFunding = {
  bank: string;
  accountName: string;
  accountNumber: string;
  /** Where customers send their payment receipt. */
  proofUrl: string;
};

const KEY = "manual_funding";

// What the deposit page showed before this was editable.
export const DEFAULT_MANUAL_FUNDING: ManualFunding = {
  bank: "Moniepoint MFB",
  accountName: "Rogue Socials Marketplace",
  accountNumber: "4005379809",
  proofUrl: "https://t.me/rogue4l",
};

export async function getManualFunding(): Promise<ManualFunding> {
  try {
    const raw = await getSetting(KEY);
    if (!raw) return DEFAULT_MANUAL_FUNDING;
    const parsed = JSON.parse(raw) as Partial<ManualFunding>;
    return {
      bank: parsed.bank?.trim() || DEFAULT_MANUAL_FUNDING.bank,
      accountName: parsed.accountName?.trim() || DEFAULT_MANUAL_FUNDING.accountName,
      accountNumber: parsed.accountNumber?.trim() || DEFAULT_MANUAL_FUNDING.accountNumber,
      proofUrl: parsed.proofUrl?.trim() || DEFAULT_MANUAL_FUNDING.proofUrl,
    };
  } catch {
    return DEFAULT_MANUAL_FUNDING;
  }
}

export async function setManualFunding(value: ManualFunding): Promise<void> {
  await setSetting(KEY, JSON.stringify(value));
}
