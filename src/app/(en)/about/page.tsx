import { pageMetadata } from "@/lib/meta";
import { AboutPage } from "@/components/pages/About";
import { aboutMeta } from "@/content/about";

export const metadata = pageMetadata({ lang: "en", path: "/about", ...aboutMeta });

export default function Page() {
  return <AboutPage lang="en" />;
}
