import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-arms-race-ashy.vercel.app"),
  title: "AI Arms Race — A Shareholder Value Simulator",
  description:
    "A retro arcade satire about AI hype, layoffs, limitless funding, and the final boss: Reality.",
  openGraph: {
    title: "AI Arms Race",
    description:
      "Automate the workforce, collect compute resources, and survive long enough to face Reality.",
    images: [
      {
        url: "/og-ai-arms-race.png",
        width: 1672,
        height: 941,
        alt: "AI Arms Race retro arcade game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Arms Race",
    description:
      "A retro arcade satire about AI hype, layoffs, compute resources, and the final boss: Reality.",
    images: ["/og-ai-arms-race.png"],
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
