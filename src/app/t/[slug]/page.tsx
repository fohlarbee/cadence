import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { loadTimetableView } from "@/lib/schedule-service";
import { Logo } from "@/components/logo";
import { TimetableView } from "@/components/timetable-view";

async function getPublished(slug: string) {
  return prisma.timetable.findFirst({
    where: { publicSlug: slug, status: "published" },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tt = await getPublished(slug);
  return {
    title: tt ? `${tt.name} — Cadence` : "Timetable — Cadence",
  };
}

export default async function PublicTimetable({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const timetable = await getPublished(slug);
  if (!timetable) notFound();

  const view = await loadTimetableView(timetable.id);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-hairline bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-display font-semibold">Cadence</span>
          </Link>
          <span className="text-sm text-muted">Published timetable</span>
        </div>
      </header>

      <main className="print-container mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">{timetable.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Pick a cohort, lecturer or room to see its schedule. Everything is
            clash-free.
          </p>
        </div>

        <TimetableView
          title={timetable.name}
          settings={view.settings}
          entries={view.entries}
          groups={view.groups}
        />
      </main>

      <footer className="no-print border-t border-hairline py-6 text-center text-xs text-faint">
        Generated with Cadence · conflict-free lecture scheduling
      </footer>
    </div>
  );
}
