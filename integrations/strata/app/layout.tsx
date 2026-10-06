import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strata — Geological Field Atlas",
  description: "Explore real geological maps and historical mineral resource reports with transparent source provenance.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
