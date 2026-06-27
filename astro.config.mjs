import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://theyrejustsleeping.com",
  // Inline all CSS — the only stylesheet is small and single-page; inlining
  // removes the last render-blocking network roundtrip.
  build: { inlineStylesheets: "always" },
  image: {
    layout: "constrained",
    responsiveStyles: true,
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: { limitInputPixels: false },
    },
  },
});
