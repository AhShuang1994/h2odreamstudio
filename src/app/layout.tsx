import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/WhatsAppFab";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.h2o-dreamer-studio.com"),
  title: {
    default: "H2ODreamer Studio · 网站设计 · Web Design Malaysia",
    template: "%s · H2ODreamer Studio",
  },
  description:
    "H2ODreamer Studio — 帮你迈出梦想的第一步。专业网站设计、Shopify 迁移、婚礼电子请柬。Web design agency in Malaysia helping dreamers take their first step online.",
  openGraph: {
    siteName: "H2ODreamer Studio",
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    images: [{ url: "/og/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/og-image.jpg"],
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={inter.variable}>
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('h2od-lang')==='en'){document.documentElement.setAttribute('data-lang','en');document.documentElement.setAttribute('lang','en');}}catch(e){}`,
          }}
        />
        <Nav />
        {children}
        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
