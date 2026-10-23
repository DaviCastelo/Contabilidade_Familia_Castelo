import { ImageResponse } from "next/og";

/** Ícone do app (torre do brasão) renderizado em PNG no tamanho pedido. */
export function appIcon(size: number) {
  const s = size / 32;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f4d3a" }}>
        <svg width={22 * s} height={22 * s} viewBox="5 8 22 22">
          <path d="M9 25V12h2.5v2h2.5v-2h4v2h2.5v-2H23v13h-4.5v-4a2.5 2.5 0 0 0-5 0v4H9Z" fill="#fffdf9" />
          <path d="M8 25.5h16" stroke="#fffdf9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
