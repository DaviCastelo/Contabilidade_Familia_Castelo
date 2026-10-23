import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Contabilidade Família Castelo",
    short_name: "Castelo $",
    description: "Gastos, ganhos e investimentos da família",
    start_url: "/",
    display: "standalone",
    background_color: "#0a1120",
    theme_color: "#172e4d",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
