import type { Metadata } from "next";
import Link from "next/link";
import { CurrentUserIndicator } from "@/components/current-user-indicator";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";

export const metadata: Metadata = {
  title: "Quiniela Platform",
  description: "Multi-league football prediction platform",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="max-w-full overflow-x-hidden antialiased">
<MobileNav />

        {children}
      </body>
    </html>
  );
}
