import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "LCSP Web",
  description: "Next.js web application for LCSP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
