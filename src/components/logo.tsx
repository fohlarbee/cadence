import { cn } from "@/lib/cn";

/** Cadence mark: a "C" carved from a rounded emerald tile with a schedule tick. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Cadence"
    >
      <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
      <path
        d="M27 14.5a9 9 0 1 0 0 11"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="28.5" cy="20" r="2.2" fill="#fff" />
    </svg>
  );
}
