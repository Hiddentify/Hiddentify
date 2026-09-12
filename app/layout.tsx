import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://hiddentify.space"),
  title: "Hiddentify",
  applicationName: "Hiddentify",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hiddentify",
  },
  description: "A fresh, interactive murder case for 3–10 friends. Investigate, deceive, and expose the killer team.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/hiddentify-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/hiddentify-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/hiddentify-icon-192.png",
    apple: [{ url: "/hiddentify-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Hiddentify",
    siteName: "Hiddentify",
    description: "A fresh, interactive murder case for 3–10 friends. Investigate, deceive, and expose the killer team.",
    images: [{
      url: "/hiddentify-search-logo.jpg",
      width: 1672,
      height: 941,
      alt: "A magnifying glass revealing one suspect in a shadowed lineup",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hiddentify",
    description: "A fresh, interactive murder case for 3–10 friends. Investigate, deceive, and expose the killer team.",
    images: ["/hiddentify-search-logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#65151b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hiddentify",
  alternateName: "hiddentify.space",
  url: "https://hiddentify.space/",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
