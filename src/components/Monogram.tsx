/** Brasão da família: torre de castelo com ameias, desenhado à mão em SVG. */
export default function Monogram({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
      <path
        d="M9 25V12h2.5v2h2.5v-2h4v2h2.5v-2H23v13h-4.5v-4a2.5 2.5 0 0 0-5 0v4H9Z"
        fill="var(--accent-ink)"
      />
      <path d="M8 25.5h16" stroke="var(--accent-ink)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
