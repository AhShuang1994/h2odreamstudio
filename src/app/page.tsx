import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import {
  QuickAnswer,
  Services,
  SelectedWork,
  Founder,
  Faq,
  ContactCta,
} from "@/components/home/sections";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/content/site";
import { homeMeta, faq } from "@/content/home";

export const metadata: Metadata = {
  title: { absolute: homeMeta.title },
  description: homeMeta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeMeta.title,
    description: homeMeta.description,
    url: "/",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${site.domain}/#business`,
      name: "H2ODreamer Studio",
      url: `${site.domain}/`,
      logo: `${site.domain}/og/logo.svg`,
      image: `${site.domain}/og/og-image.jpg`,
      description:
        "Web design studio in Malaysia — landing pages, multi-page corporate websites, wedding e-invitations and Shopify migration. Landing pages from RM 590; custom 5-page corporate sites from RM 2,500.",
      areaServed: "MY",
      address: {
        "@type": "PostalAddress",
        addressRegion: "Johor",
        addressCountry: "MY",
      },
      geo: { "@type": "GeoCoordinates", latitude: 1.4927, longitude: 103.7414 },
      priceRange: "RM 590 - RM 2,500+",
      serviceType: [
        "Web Design",
        "Wedding E-Invitation",
        "Landing Page",
        "Shopify Migration",
      ],
      knowsLanguage: ["en", "zh"],
      founder: {
        "@type": "Person",
        name: "Hui Huang Ong",
        jobTitle: "Founder",
        image: `${site.domain}/og/founder-avatar.webp`,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+60175138694",
        contactType: "sales",
        availableLanguage: ["English", "Chinese"],
      },
      sameAs: ["https://www.instagram.com/h2odreamer.studio/"],
    },
    {
      "@type": "WebSite",
      "@id": `${site.domain}/#website`,
      url: `${site.domain}/`,
      name: "H2ODreamer Studio",
      inLanguage: ["zh-CN", "en"],
      publisher: { "@id": `${site.domain}/#business` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.items.map((f) => ({
        "@type": "Question",
        name: f.q.cn,
        acceptedAnswer: { "@type": "Answer", text: f.a.cn },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main>
      <JsonLd data={jsonLd} />
      <Hero />
      <QuickAnswer />
      <Services />
      <SelectedWork />
      <Founder />
      <Faq />
      <ContactCta />
    </main>
  );
}
