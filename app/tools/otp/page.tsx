import { CustomerPage } from "@/components/dashboard/customer-page";
import { PageHeader } from "@/components/page-header";
import { OtpShop } from "@/components/tools/otp-shop";

export const dynamic = "force-dynamic";

export default function OtpPage() {
  return (
    <CustomerPage>
      <PageHeader title="OTP numbers" description="A one-time phone number to receive a verification code for any app. Paid from your wallet." />
      <div className="mt-6">
        <OtpShop />
      </div>
    </CustomerPage>
  );
}
