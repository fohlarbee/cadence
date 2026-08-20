import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/schedule-service";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLecturer, deleteLecturer } from "@/app/actions/data";
import { AvailabilityEditor } from "@/components/availability-editor";

function parseUnavailable(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function LecturersPage() {
  await requireUser();
  const [lecturers, departments, settings] = await Promise.all([
    prisma.lecturer.findMany({ include: { department: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  const editorLecturers = lecturers.map((l) => ({
    id: l.id,
    name: l.title ? `${l.title} ${l.name}` : l.name,
    unavailable: parseUnavailable(l.unavailable),
  }));

  return (
    <div className="rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Lecturers</h1>
        <p className="mt-1 text-sm text-muted">
          Teaching staff and the periods they are unavailable to teach.
        </p>
      </div>

      {departments.length > 0 && (
        <Card>
          <CardTitle className="mb-4">Add a lecturer</CardTitle>
          <form
            action={createLecturer}
            className="grid gap-4 sm:grid-cols-[120px_1fr_1fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Dr." />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Grace Ekong" required />
            </div>
            <div>
              <Label htmlFor="departmentId">Department</Label>
              <Select id="departmentId" name="departmentId" defaultValue={departments[0].id}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Add</Button>
          </form>
        </Card>
      )}

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
              <th className="p-4">Lecturer</th>
              <th className="p-4">Department</th>
              <th className="p-4">Blocked slots</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {lecturers.map((l) => (
              <tr key={l.id} className="border-b border-hairline last:border-0">
                <td className="p-4 font-medium">
                  {l.title ? `${l.title} ${l.name}` : l.name}
                </td>
                <td className="p-4 text-muted">{l.department.code}</td>
                <td className="p-4 text-muted">{parseUnavailable(l.unavailable).length}</td>
                <td className="p-4 text-right">
                  <form action={deleteLecturer}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs text-muted hover:text-alert">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {lecturers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">
                  No lecturers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editorLecturers.length > 0 && (
        <Card>
          <CardTitle>Availability</CardTitle>
          <CardDescription className="mt-1 mb-4">
            Cadence will never schedule a lecturer into a blocked slot.
          </CardDescription>
          <AvailabilityEditor lecturers={editorLecturers} settings={settings} />
        </Card>
      )}
    </div>
  );
}
