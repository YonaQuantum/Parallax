import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { site } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: site.copy.brand.title,
  description: site.copy.brand.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const themeStyle = {
    "--accent": site.theme.accent,
    "--yellow": site.theme.accent
  } as CSSProperties;

  return (
    <html data-scroll-behavior="smooth" lang={site.locale}>
      <body style={themeStyle}>{children}</body>
    </html>
  );
}
