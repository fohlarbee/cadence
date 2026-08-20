import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-primary/50"
    >
      <div className="font-display text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [courses, lecturers, rooms, cohorts, latest] = await Promise.all([
    prisma.course.count(),
    prisma.lecturer.count(),
    prisma.room.count(),
    prisma.cohort.count(),
    prisma.timetable.findFirst({ orderBy: { generatedAt: "desc" } }),
  ]);

  const ready = courses > 0 && rooms > 0 && cohorts > 0 && lecturers > 0;
  const latestParams = latest
    ? (safeParse(latest.params) as Record<string, unknown>)
    : null;
  const utilization = latestParams?.utilization as
    | { roomOccupancyPct: number; placedEvents: number; totalEvents: number }
    | undefined;
  const unplaced = latest ? (safeParse(latest.unplaced) as unknown[]) : [];

  return (
    <div className="rise space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Good day, {user.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your department scheduling workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Courses" value={courses} href="/manage/courses" />
        <Stat label="Lecturers" value={lecturers} href="/manage/lecturers" />
        <Stat label="Rooms" value={rooms} href="/manage/rooms" />
        <Stat label="Cohorts" value={cohorts} href="/manage/cohorts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Generate a timetable</CardTitle>
          <CardDescription className="mt-1">
            The Cadence engine places every class with zero lecturer, room or cohort
            clashes, then optimizes the schedule for compact, balanced days.
          </CardDescription>
          <div className="mt-5 flex gap-3">
            <Link href="/generate" className="flex-1 sm:flex-none">
              <Button size="lg" className="w-full sm:w-auto" disabled={!ready}>
                {ready ? "Generate now" : "Add data first"}
              </Button>
            </Link>
            <Link href="/timetables" className="flex-1 sm:flex-none">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View timetables
              </Button>
            </Link>
          </div>
          {!ready && (
            <p className="mt-3 text-xs text-warn">
              Add at least one lecturer, room, cohort and course before generating.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Latest run</CardTitle>
          {latest ? (
            <div className="mt-3 space-y-2 text-sm">
              <Link
                href={`/timetable/${latest.id}`}
                className="font-medium text-primary hover:underline"
              >
                {latest.name}
              </Link>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    latest.hardOk
                      ? "bg-primary-tint text-primary"
                      : "bg-alert/10 text-alert"
                  }`}
                >
                  {latest.hardOk ? "Conflict-free" : `${unplaced.length} unplaced`}
                </span>
                {latest.status === "published" && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    Published
                  </span>
                )}
              </div>
              {utilization && (
                <p className="text-muted">
                  {utilization.placedEvents}/{utilization.totalEvents} classes ·{" "}
                  {utilization.roomOccupancyPct}% room use
                </p>
              )}
            </div>
          ) : (
            <CardDescription className="mt-3">
              No timetables yet. Generate your first one.
            </CardDescription>
          )}
        </Card>
      </div>
    </div>
  );
}

function safeParse(s: string): Record<string, unknown> | unknown[] {
  try {
    return JSON.parse(s) as Record<string, unknown> | unknown[];
  } catch {
    return {};
  }
}
