import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LOG",
    short_name: "LOG",
    description: "Workout logger",
    start_url: "/workouts",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    categories: ["fitness", "health", "lifestyle"],
    icons: [
      {
        src: "/icon0",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
