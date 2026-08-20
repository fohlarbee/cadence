import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCourse, deleteCourse } from "@/app/actions/data";
import { ROOM_KIND_LABEL } from "@/lib/timegrid";

export default async function CoursesPage() {
  await requireUser();
  const [courses, lecturers, cohorts] = await Promise.all([
    prisma.course.findMany({
      include: { lecturer: true, cohort: true },
      orderBy: { code: "asc" },
    }),
    prisma.lecturer.findMany({ orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { level: "asc" } }),
  ]);

  const canAdd = lecturers.length > 0 && cohorts.length > 0;
  const lecturerName = (l: { title: string | null; name: string }) =>
    l.title ? `${l.title} ${l.name}` : l.name;

  return (
    <div className="rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Courses</h1>
        <p className="mt-1 text-sm text-muted">
          Each course is split into weekly meetings the engine must place.
        </p>
      </div>

      {canAdd ? (
        <Card>
          <CardTitle className="mb-4">Add a course</CardTitle>
          <form action={createCourse} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="CSC201" required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Computer Programming I" required />
            </div>
            <div>
              <Label htmlFor="lecturerId">Lecturer</Label>
              <Select id="lecturerId" name="lecturerId" defaultValue={lecturers[0].id}>
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {lecturerName(l)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="cohortId">Cohort</Label>
              <Select id="cohortId" name="cohortId" defaultValue={cohorts[0].id}>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="requiresKind">Room type</Label>
              <Select id="requiresKind" name="requiresKind" defaultValue="ANY">
                <option value="ANY">Any room</option>
                <option value="HALL">Lecture hall</option>
                <option value="LAB">Laboratory</option>
                <option value="SEMINAR">Seminar room</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="creditUnits">Units</Label>
                <Input id="creditUnits" name="creditUnits" type="number" min={1} defaultValue={3} />
              </div>
              <div>
                <Label htmlFor="sessionsPerWeek">/week</Label>
                <Input
                  id="sessionsPerWeek"
                  name="sessionsPerWeek"
                  type="number"
                  min={1}
                  defaultValue={2}
                />
              </div>
              <div>
                <Label htmlFor="sessionLength">Length</Label>
                <Input id="sessionLength" name="sessionLength" type="number" min={1} defaultValue={1} />
              </div>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-4">
              <Button type="submit">Add course</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            Add at least one lecturer and one cohort before creating courses.
          </p>
        </Card>
      )}

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-4">Code</th>
              <th className="p-4">Title</th>
              <th className="p-4">Cohort</th>
              <th className="p-4">Lecturer</th>
              <th className="p-4">Room</th>
              <th className="p-4">Meetings</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-0">
                <td className="p-4 font-mono text-xs font-semibold">{c.code}</td>
                <td className="p-4">{c.title}</td>
                <td className="p-4 text-muted">{c.cohort.name}</td>
                <td className="p-4 text-muted">{lecturerName(c.lecturer)}</td>
                <td className="p-4 text-muted">
                  {c.requiresKind ? ROOM_KIND_LABEL[c.requiresKind] : "Any"}
                </td>
                <td className="p-4 text-muted">
                  {c.sessionsPerWeek} × {c.sessionLength}p
                </td>
                <td className="p-4 text-right">
                  <form action={deleteCourse}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-muted hover:text-alert">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
