import { pageMetadata } from "@/lib/meta";
import { ContactPage } from "@/components/pages/Contact";
import { contactMeta } from "@/content/contact";

export const metadata = pageMetadata({ lang: "en", path: "/contact", ...contactMeta });

export default function Page() {
  return <ContactPage lang="en" />;
}
