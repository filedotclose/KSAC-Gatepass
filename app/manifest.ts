import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KSAC GatePass & Room Booking",
    short_name: "KSAC GatePass",
    description: "Digital GatePass management, movement verification, and society room booking for KIIT University.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7fbf8",
    theme_color: "#047857",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      }
    ],
    categories: ["education", "utilities", "productivity"],
    shortcuts: [
      {
        name: "My GatePass",
        short_name: "GatePass",
        description: "View or request your KSAC GatePass",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Society Rooms",
        short_name: "Rooms",
        description: "Reserve society activity spaces",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
