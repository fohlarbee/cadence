import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: "01",
    title: "Describe your department",
    body: "Add courses, lecturers, rooms, cohorts and when staff are free. A few minutes, once a semester.",
  },
  {
    n: "02",
    title: "Cadence solves it",
    body: "The engine places every class with zero lecturer, room or cohort clashes, then optimizes for compact, balanced days.",
  },
  {
    n: "03",
    title: "Publish & share",
    body: "One link students, lecturers and admins can filter and print. No more pinned-up paper grids.",
  },
];

const FEATURES = [
  {
    title: "Conflict-free, guaranteed",
    body: "Hard rules are never broken: no double-booked lecturer, room or class group. Ever.",
  },
  {
    title: "It explains itself",
    body: "If a class truly can't fit, Cadence tells you exactly why — not just that it failed.",
  },
  {
    title: "Balanced, not just valid",
    body: "A second pass trims idle gaps and spreads courses across the week for humane timetables.",
  },
  {
    title: "Seconds, not weeks",
    body: "What takes a scheduling committee days of back-and-forth, Cadence produces in one click.",
  },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">Cadence</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span className="inline-block rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-medium text-muted">
            Automatic timetable generator · University of Jos
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Clash-free lecture timetables,{" "}
            <span className="text-primary">generated in seconds.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Cadence turns your courses, lecturers and rooms into a balanced weekly
            schedule — with no overlapping lectures, double-booked venues or lecturer
            clashes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/t/csc-first-semester">
              <Button size="lg" className="glow-primary">
                See a live timetable
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in to build one
              </Button>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-hairline bg-surface p-6">
                <div className="font-mono text-sm text-primary">{s.n}</div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The engine */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              A real scheduling engine under the hood
            </h2>
            <p className="mt-3 text-muted">
              Cadence models timetabling as a constraint-satisfaction problem and solves
              it in two phases — constructive graph-colouring, then simulated-annealing
              optimization.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-hairline bg-surface p-6">
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1 px-6 text-center text-xs text-faint">
          <p>
            Cadence — an undergraduate project by Adetunji Oluwatimilehin Solomon
            (UJ/2022/NS/0184)
          </p>
          <p>Department of Computer Science, University of Jos · Supervisor: Dr. Oyeyinka Oyerinde</p>
        </div>
      </footer>
    </div>
  );
}
