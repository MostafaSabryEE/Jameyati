import type { MetadataRoute } from "next";

// Lets Android "Add to Home screen" use the logo; iOS uses app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JAMEYATI | جمعيتي",
    short_name: "Jameyati",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9f3",
    theme_color: "#0e5056",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
