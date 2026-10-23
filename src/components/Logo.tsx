import Image from "next/image";

/** Brasão da família: torre de castelo com moeda, em ouro sobre azul-marinho. */
export default function Logo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Brasão Família Castelo"
      width={size}
      height={size}
      priority
      className={`shrink-0 ${className}`}
    />
  );
}
