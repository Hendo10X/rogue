import { CustomerPage } from "@/components/dashboard/customer-page";
import { PageHeader } from "@/components/page-header";
import { LogRequestForm } from "@/components/tools/log-request-form";

export const dynamic = "force-dynamic";

export default function RequestLogPage() {
  return (
    <CustomerPage>
      <PageHeader title="Request a log" description="Describe the log you need. We'll reply here once we've checked with our suppliers." />
      <div className="mt-6">
        <LogRequestForm />
      </div>
    </CustomerPage>
  );
}
