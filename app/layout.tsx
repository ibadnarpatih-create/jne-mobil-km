import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoStoreProvider } from "@/lib/demo-store";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Movetra",
  description: "Move Smarter, Work Better",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png?v=2",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#172d72" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><DemoStoreProvider>{children}</DemoStoreProvider><ServiceWorkerRegister /></body></html>;
}
