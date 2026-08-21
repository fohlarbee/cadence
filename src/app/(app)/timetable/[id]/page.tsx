import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { loadTimetableView } from "@/lib/schedule-service";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimetableView } from "@/components/timetable-view";
import { ShareLink } from "@/components/share-link";
import { publishAction, unpublishAction, deleteTimetable } from "@/app/actions/timetable";

interface Unplaced {
  courseCode: string;
  title: string;
  reason: string;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="font-display text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export default async function TimetableDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) notFound();

  const view = await loadTimetableView(id);
  const unplaced = safeParse<Unplaced[]>(timetable.unplaced, []);
  const p = safeParse<Record<string, unknown>>(timetable.params, {});
  const util = p.utilization as
    | { roomOccupancyPct: number; placedEvents: number; totalEvents: number }
    | undefined;
  const beforeAfter = {
    before: (p.scoreAfterConstruct as number) ?? timetable.score,
    after: timetable.score,
  };
  const improvement =
    beforeAfter.before > 0
      ? Math.round(((beforeAfter.before - beforeAfter.after) / beforeAfter.before) * 100)
      : 0;

  return (
    <div className="rise space-y-6">
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/timetables" className="text-sm text-muted hover:text-fg">
            ← Timetables
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold">{timetable.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                timetable.hardOk ? "bg-primary-tint text-primary" : "bg-alert/10 text-alert"
              }`}
            >
              {timetable.hardOk ? "Conflict-free" : `${unplaced.length} unplaced`}
            </span>
            {timetable.status === "published" && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                Published
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {timetable.status === "published" ? (
            <form action={unpublishAction}>
              <input type="hidden" name="id" value={timetable.id} />
              <Button variant="outline">Unpublish</Button>
            </form>
          ) : (
            <form action={publishAction}>
              <input type="hidden" name="id" value={timetable.id} />
              <Button>Publish</Button>
            </form>
          )}
          <form action={deleteTimetable}>
            <input type="hidden" name="id" value={timetable.id} />
            <Button variant="danger">Delete</Button>
          </form>
        </div>
      </div>

      {timetable.status === "published" && timetable.publicSlug ? (
        <div className="no-print">
          <ShareLink slug={timetable.publicSlug} />
        </div>
      ) : (
        <p className="no-print rounded-2xl border border-hairline bg-surface p-4 text-sm text-muted">
          This timetable is a draft. Click <span className="font-medium text-fg">Publish</span>{" "}
          to get a shareable public link students and lecturers can open.
        </p>
      )}

      <div className="no-print grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Classes placed" value={`${util?.placedEvents ?? view.entries.length}/${util?.totalEvents ?? view.entries.length}`} />
        <Metric label="Room occupancy" value={`${util?.roomOccupancyPct ?? 0}%`} />
        <Metric label="Soft score (lower is better)" value={timetable.score} />
        <Metric label="Optimizer gain" value={`${improvement}%`} />
      </div>

      {unplaced.length > 0 && (
        <Card className="no-print border-alert/30">
          <CardTitle className="text-alert">Couldn&apos;t place {unplaced.length}</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {unplaced.map((u) => (
              <li key={u.courseCode} className="flex flex-col gap-0.5">
                <span className="font-medium">
                  <span className="font-mono text-xs">{u.courseCode}</span> — {u.title}
                </span>
                <span className="text-muted">{u.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="print-container">
        <TimetableView
          title={timetable.name}
          settings={view.settings}
          entries={view.entries}
          groups={view.groups}
        />
      </div>
    </div>
  );
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
