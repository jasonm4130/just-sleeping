import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://theyrejustsleeping.com",
  image: {
    layout: "constrained",
    responsiveStyles: true,
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: { limitInputPixels: false },
    },
  },
});
