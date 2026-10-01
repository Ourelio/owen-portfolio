import type { Metadata, Viewport } from "next";
import Runner from "@/components/Runner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Owen Ourelio Bong - wavess",
  description:
    "Cybersecurity student at BINUS University, focused on digital forensics. Writeups, CTF challenges, projects and how to get in touch.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dceff3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c161a" },
  ],
};

/**
 * Runs before first paint so the page never flashes the wrong theme.
 * System preference by default, a saved choice if there is one.
 */
const themeScript = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* Behind everything, on every screen, in both modes. */}
        <Runner />
        {children}
      </body>
    </html>
  );
}
