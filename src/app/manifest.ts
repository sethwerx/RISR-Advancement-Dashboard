import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Advancement Office",
    short_name: "Advancement Office",
    description: "Admissions, registration, and alumni relations dashboard for Ruamrudee International School Ratchapruek.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fa",
    theme_color: "#23355D",
    icons: [
      {
        src: "/brand/icon-navy.png",
        sizes: "1440x934",
        type: "image/png",
      },
    ],
  };
}
