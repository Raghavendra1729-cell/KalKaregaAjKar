import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kal Karega, Aaj Kar",
    short_name: "Kal Karega",
    description: "Private Study and Gym plans, timers, history, and reminders.",
    start_url: "/study",
    display: "standalone",
    background_color: "#F7F4EE",
    theme_color: "#F7F4EE",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
