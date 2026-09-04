import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hiddentify.space"),
  title: "Hiddentify",
  applicationName: "Hiddentify",
  description: "A fresh, interactive murder case for 3–10 friends. Investigate, deceive, and expose the killer team.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/hiddentify-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/hiddentify-icon.png",
    apple: [{ url: "/hiddentify-icon.png", sizes: "512x512", type: "image/png" }],
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
        {children}
      </body>
    </html>
  );
}
