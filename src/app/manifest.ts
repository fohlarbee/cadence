import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cadence — Automatic Timetable Generator",
    short_name: "Cadence",
    description:
      "Generate conflict-free, balanced lecture timetables in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fa",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
