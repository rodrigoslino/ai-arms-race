import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-arms-race-ashy.vercel.app"),
  title: "AI Arms Race — A Shareholder Value Simulator",
  description:
    "A retro arcade satire about AI hype, layoffs, limitless funding, and the final boss: Reality.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "AI Arms Race",
    description:
      "Automate the workforce, collect compute resources, and survive long enough to face Reality.",
    url: "/",
    siteName: "AI Arms Race",
    type: "website",
    images: [
      {
        url: "/og-ai-arms-race-share-v2.jpg",
        secureUrl: "/og-ai-arms-race-share-v2.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "AI Arms Race retro arcade game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Arms Race",
    description:
      "A retro arcade satire about AI hype, layoffs, compute resources, and the final boss: Reality.",
    images: ["/og-ai-arms-race-share-v2.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
