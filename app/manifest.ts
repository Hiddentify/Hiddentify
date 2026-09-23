import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hiddentify",
    short_name: "Hiddentify",
    description: "A live social murder-mystery game for 3–10 friends.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d090b",
    theme_color: "#65151b",
    orientation: "portrait-primary",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/hiddentify-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/hiddentify-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/hiddentify-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
