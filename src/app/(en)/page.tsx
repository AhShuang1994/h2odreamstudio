import { pageMetadata } from "@/lib/meta";
import { HomePage } from "@/components/pages/Home";
import { homeMeta } from "@/content/home";

export const metadata = pageMetadata({ lang: "en", path: "/", ...homeMeta });

export default function Page() {
  return <HomePage lang="en" />;
}
