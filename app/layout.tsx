import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Arms Race — A Shareholder Value Simulator",
  description:
    "A retro arcade satire about AI hype, layoffs, limitless funding, and the final boss: Reality.",
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
