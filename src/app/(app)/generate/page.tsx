import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { GenerateForm } from "./generate-form";

export default async function GeneratePage() {
  await requireUser();
  const [courses, rooms, cohorts, lecturers] = await Promise.all([
    prisma.course.count(),
    prisma.room.count(),
    prisma.cohort.count(),
    prisma.lecturer.count(),
  ]);
  const ready = courses > 0 && rooms > 0 && cohorts > 0 && lecturers > 0;

  return (
    <div className="rise mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Generate a timetable</h1>
        <p className="mt-1 text-sm text-muted">
          Cadence guarantees zero hard clashes, then tunes the schedule to your priorities.
        </p>
      </div>

      {ready ? (
        <Card>
          <GenerateForm />
        </Card>
      ) : (
        <Card>
          <CardTitle>Not enough data yet</CardTitle>
          <CardDescription className="mt-1">
            Add at least one lecturer, room, cohort and course first.
          </CardDescription>
          <div className="mt-4 flex gap-3 text-sm">
            <Link href="/manage/courses" className="text-primary hover:underline">
              Manage courses →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
