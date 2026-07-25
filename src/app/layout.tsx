import type { Metadata } from "next";
import { GlobalThemeEffects } from "@/components/global-theme-effects";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela Platform",
  description: "Multi-league football prediction platform",
  icons: {
    icon: [{ url: "/favicon-mascots.png", type: "image/png", sizes: "256x256" }],
    shortcut: ["/favicon-mascots.png"],
    apple: ["/favicon-mascots.png"],
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="max-w-full overflow-x-hidden antialiased"
        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
      >
        <GlobalThemeEffects />
        <SiteHeader />
        <div className="relative z-20">{children}</div>
      </body>
    </html>
  );
}
