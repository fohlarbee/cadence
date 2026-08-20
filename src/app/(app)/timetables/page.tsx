import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TimetablesPage() {
  await requireUser();
  const timetables = await prisma.timetable.findMany({
    orderBy: { generatedAt: "desc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="rise space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Timetables</h1>
          <p className="mt-1 text-sm text-muted">Every generated version.</p>
        </div>
        <Link href="/generate">
          <Button>Generate new</Button>
        </Link>
      </div>

      {timetables.length === 0 ? (
        <Card>
          <CardTitle>No timetables yet</CardTitle>
          <CardDescription className="mt-1">
            Generate your first timetable to see it here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {timetables.map((t) => (
            <Link
              key={t.id}
              href={`/timetable/${t.id}`}
              className="rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-semibold">{t.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.hardOk ? "bg-primary-tint text-primary" : "bg-alert/10 text-alert"
                  }`}
                >
                  {t.hardOk ? "Conflict-free" : "Has gaps"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {t._count.assignments} classes · soft score {t.score}
              </p>
              <p className="mt-1 text-xs text-faint">
                {t.status === "published" ? "Published" : "Draft"} ·{" "}
                {new Date(t.generatedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
