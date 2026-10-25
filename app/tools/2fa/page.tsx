import { CustomerPage } from "@/components/dashboard/customer-page";
import { PageHeader } from "@/components/page-header";
import { TwoFactorTool } from "@/components/tools/two-factor-tool";

export const dynamic = "force-dynamic";

export default function TwoFactorPage() {
  return (
    <CustomerPage>
      <PageHeader title="2FA codes" description="Get the 6-digit login code for any account that has a 2FA key." />
      <div className="mt-6">
        <TwoFactorTool />
      </div>
    </CustomerPage>
  );
}
