import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lucky Caps",
    short_name: "Lucky Caps",
    description: "Premium caps, custom embroidery, and entrepreneur packs.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      {
        src: "/brand/newlogocropped.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/newlogocropped.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
