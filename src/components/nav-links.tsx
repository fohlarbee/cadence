"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/manage/courses", label: "Courses" },
  { href: "/manage/lecturers", label: "Lecturers" },
  { href: "/manage/rooms", label: "Rooms" },
  { href: "/manage/cohorts", label: "Cohorts" },
  { href: "/generate", label: "Generate" },
  { href: "/timetables", label: "Timetables" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors",
              variant === "mobile" && "whitespace-nowrap",
              active
                ? "border-primary font-medium text-fg"
                : "border-transparent text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
