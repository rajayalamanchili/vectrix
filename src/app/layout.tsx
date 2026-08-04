import type { Metadata } from "next";
import "./globals.css";

/**
 * Font loading: this project is designed for Fraunces (display),
 * Inter (body), and IBM Plex Mono (data/code) via next/font/google --
 * see README.md > "Restoring Google Fonts" for the one-line swap. It
 * ships with system-font fallbacks by default so `npm run build` never
 * depends on being able to reach fonts.googleapis.com (useful in
 * network-restricted sandboxes/CI); in a normal dev machine or Claude
 * Code with internet access, swap the imports below back in for the
 * exact intended look.
 */

export const metadata: Metadata = {
  title: "Vectrix",
  description:
    "An interactive, extensible playground for learning AI engineering concepts hands-on -- starting with Retrieval-Augmented Generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-chart-bg text-ink-100 antialiased">
        {children}
      </body>
    </html>
  );
}
