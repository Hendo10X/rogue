import { CustomerPage } from "@/components/dashboard/customer-page";
import { PageHeader } from "@/components/page-header";
import { ProxyShop } from "@/components/tools/proxy-shop";

export const dynamic = "force-dynamic";

export default function ProxiesPage() {
  return (
    <CustomerPage>
      <PageHeader title="Proxies" description="ISP, IPv4, mobile and IPv6 proxies, yours alone for the whole period. Paid from your wallet." />
      <div className="mt-6">
        <ProxyShop />
      </div>
    </CustomerPage>
  );
}
