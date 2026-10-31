import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Baloo_Da_2 } from "next/font/google";
import "./globals.css";

const body = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = Baloo_Da_2({
  subsets: ["bengali", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ভাড়া কত? | সরকারি রেটে ন্যায্য ভাড়া যাচাই",
  description:
    "সিএনজি ও বাসের সরকারি রেট অনুযায়ী ন্যায্য ভাড়া জানুন, চালক বেশি চাইলে সহজে ধরুন।",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17283a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bn"
      className={`${body.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
