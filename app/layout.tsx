import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reddit Scraper",
  description: "Anonymized Reddit Thread Scraper",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-[100dvh] flex flex-col font-sans bg-black text-white">
        {children}
      </body>
    </html>
  );
}
