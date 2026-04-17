import type { Metadata } from "next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Content Hub",
  description: "Content planning, review, and analytics dashboard for LinkedIn and Substack.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
