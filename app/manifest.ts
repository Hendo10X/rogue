import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Rogue",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#E54D1B",
    icons: [
      {
        src: "/Roguesocialsyellow.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
