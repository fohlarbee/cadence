import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-hairline bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Cadence
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavLinks variant="desktop" />
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {user.fullName.split(" ")[0]}
            </span>
            <form action={logoutAction}>
              <button className="text-sm text-muted transition-colors hover:text-fg">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-hairline px-4 py-2 lg:hidden">
          <NavLinks variant="mobile" />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
