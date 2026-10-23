import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Contabilidade Família Castelo",
    short_name: "Castelo $",
    description: "Gastos, ganhos e investimentos da família",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#1f4d3a",
    lang: "pt-BR",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
