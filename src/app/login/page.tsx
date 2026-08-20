import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <Logo className="h-7 w-7" />
          <span className="font-display font-semibold text-fg">Cadence</span>
        </Link>

        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 mb-8 text-sm text-muted">
          Sign in to manage courses and generate timetables.
        </p>

        <LoginForm />

        <p className="mt-8 text-center text-xs text-faint">
          Demo · admin@cadence.edu / password123
        </p>
      </div>
    </main>
  );
}
