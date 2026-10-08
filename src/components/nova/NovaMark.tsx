export function NovaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="nova-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--nova-amber)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="9" fill="url(#nova-g)" />
      <ellipse cx="32" cy="32" rx="27" ry="10" fill="none" stroke="url(#nova-g)" strokeWidth="2.5" transform="rotate(-25 32 32)" />
      <ellipse cx="32" cy="32" rx="27" ry="10" fill="none" stroke="url(#nova-g)" strokeWidth="1.5" opacity="0.55" transform="rotate(40 32 32)" />
      <circle cx="54" cy="21" r="2.5" fill="var(--nova-amber)" />
    </svg>
  );
}
