import { pageMetadata } from "@/lib/meta";
import { PricingPage } from "@/components/pages/Pricing";
import { pricingMeta } from "@/content/pricing";

export const metadata = pageMetadata({ lang: "zh", path: "/pricing", ...pricingMeta });

export default function Page() {
  return <PricingPage lang="zh" />;
}
